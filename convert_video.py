"""
EasyBallot 视频处理上传脚本

工作流:
  1. 视频分辨率压缩到 720p（保持宽高比）
  2. 视频码率压缩（优先 GPU 加速：NVIDIA NVENC > AMD AMF > Intel QSV > CPU 回退）
  3. HLS 封装（生成 .m3u8 + .ts 分片）
  4. 上传至七牛云
  5. 输出 m3u8 的 HTTPS CDN 路径

依赖: pip install python-dotenv qiniu
需要安装 ffmpeg（含 GPU 编码器支持）并在 PATH 中

用法: python convert_video.py <视频文件路径>
"""

import os
import sys
import json
import shutil
import tempfile
import subprocess
from pathlib import Path
from datetime import datetime

from dotenv import load_dotenv

ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(ENV_PATH)


# ---------- 七牛配置 ----------
QINIU_ACCESS_KEY = os.getenv("QINIU_ACCESS_KEY")
QINIU_SECRET_KEY = os.getenv("QINIU_SECRET_KEY")
QINIU_BUCKET = os.getenv("QINIU_BUCKET", "easyballot")
QINIU_DOMAIN = os.getenv("QINIU_DOMAIN", "https://cdn.tp.xuanjian.top")
QINIU_REGION = os.getenv("QINIU_REGION", "as0")

REGION_UPLOAD_URLS = {
    "z0": "https://upload.qiniup.com",
    "z1": "https://upload-z1.qiniup.com",
    "z2": "https://upload-z2.qiniup.com",
    "na0": "https://upload-na0.qiniup.com",
    "as0": "https://upload-as0.qiniup.com",
}
QINIU_UPLOAD_URL = REGION_UPLOAD_URLS.get(QINIU_REGION, REGION_UPLOAD_URLS["z0"])

HLS_SEGMENT_TIME = 6
TARGET_HEIGHT = 720


# ---------- GPU 编码器检测 ----------
def detect_gpu_encoder():
    """检测可用的 GPU 硬件编码器，返回编码器名称、标签和加速参数"""
    try:
        result = subprocess.run(
            ["ffmpeg", "-hide_banner", "-encoders"],
            capture_output=True, text=True, timeout=10
        )
        output = result.stdout

        # 直接尝试用 NVENC 编码一帧测试是否真正可用
        if "h264_nvenc" in output:
            test = subprocess.run(
                ["ffmpeg", "-hide_banner", "-f", "lavfi", "-i", "color=c=black:s=2x2:d=0.1",
                 "-c:v", "h264_nvenc", "-f", "null", "-"],
                capture_output=True, text=True, timeout=15
            )
            if test.returncode == 0:
                print("[INFO] NVIDIA NVENC 编码器检测: OK")
                return "h264_nvenc", "NVIDIA NVENC", ["-hwaccel", "cuda"]
            # lavfi 测试失败但编码器在列表中，仍尝试使用
            print("[INFO] NVIDIA NVENC 在列表中但测试未通过，仍尝试使用")
            print(f"[DEBUG] NVENC test stderr: {test.stderr[-200:]}")
            return "h264_nvenc", "NVIDIA NVENC (forced)", ["-hwaccel", "cuda"]

        if "h264_amf" in output:
            test = subprocess.run(
                ["ffmpeg", "-hide_banner", "-f", "lavfi", "-i", "color=c=black:s=2x2:d=0.1",
                 "-c:v", "h264_amf", "-f", "null", "-"],
                capture_output=True, text=True, timeout=15
            )
            if test.returncode == 0:
                print("[INFO] AMD AMF 编码器检测: OK")
                return "h264_amf", "AMD AMF", []

        if "h264_qsv" in output:
            test = subprocess.run(
                ["ffmpeg", "-hide_banner", "-f", "lavfi", "-i", "color=c=black:s=2x2:d=0.1",
                 "-c:v", "h264_qsv", "-f", "null", "-"],
                capture_output=True, text=True, timeout=15
            )
            if test.returncode == 0:
                print("[INFO] Intel QuickSync 编码器检测: OK")
                return "h264_qsv", "Intel QuickSync", []

    except Exception:
        pass

    print("[INFO] 未检测到 GPU 编码器，使用 CPU")
    print("[TIP]  如需 GPU 加速，请安装包含 NVENC 的 ffmpeg 版本")
    print("[TIP]  NVIDIA: https://www.gyan.dev/ffmpeg/builds/ (选 full_build)")
    return "libx264", "CPU (libx264)", []


# ---------- ffmpeg ----------
def check_ffmpeg():
    if not shutil.which("ffmpeg"):
        print("[ERROR] 未找到 ffmpeg，请安装后添加到 PATH")
        sys.exit(1)
    version = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
    print(f"[INFO] {version.stdout.split(chr(10))[0]}")


def get_video_info(input_path: str) -> dict:
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", input_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[ERROR] 无法读取视频信息: {result.stderr}")
        sys.exit(1)
    info = json.loads(result.stdout)
    video_stream = next(
        (s for s in info.get("streams", []) if s.get("codec_type") == "video"), None
    )
    if not video_stream:
        print("[ERROR] 文件中未找到视频流")
        sys.exit(1)
    return {
        "width": video_stream.get("width", 0),
        "height": video_stream.get("height", 0),
        "duration": float(info.get("format", {}).get("duration", 0)),
        "bitrate": int(info.get("format", {}).get("bit_rate", 0)),
        "codec": video_stream.get("codec_name", "unknown"),
    }


def process_video(input_path: str, output_dir: str, encoder: str, encoder_label: str, hwaccel_args: list) -> str:
    """处理视频：GPU 加速压缩 + HLS 封装"""
    video_info = get_video_info(input_path)
    orig_w, orig_h = video_info["width"], video_info["height"]
    duration = video_info["duration"]

    print(f"[INFO] 原始: {orig_w}x{orig_h}, {duration:.1f}s, {video_info['bitrate']//1000}kbps")
    print(f"[INFO] 编码器: {encoder_label}")

    if orig_h > TARGET_HEIGHT:
        scale_w = max(2, int(orig_w * TARGET_HEIGHT / orig_h) // 2 * 2)
        scale_h = TARGET_HEIGHT
        print(f"[1/3] 分辨率: {orig_w}x{orig_h} -> {scale_w}x{scale_h}")
        scale_filter = f"scale={scale_w}:{scale_h}"
    else:
        scale_w, scale_h = orig_w, orig_h
        print(f"[1/3] 分辨率无需压缩（已 <= 720p）")
        scale_filter = "scale=trunc(iw/2)*2:trunc(ih/2)*2"

    m3u8_path = os.path.join(output_dir, "index.m3u8")
    ts_pattern = os.path.join(output_dir, "segment_%03d.ts")

    # GPU 编码器参数
    if encoder == "h264_nvenc":
        encoder_args = [
            "-c:v", "h264_nvenc",
            "-preset", "p4",
            "-rc", "vbr",
            "-b:v", "2M",
            "-maxrate", "2.5M",
            "-bufsize", "5M",
            "-spatial-aq", "1",
        ]
    elif encoder == "h264_amf":
        encoder_args = [
            "-c:v", "h264_amf",
            "-quality", "quality",
            "-rc", "cqp",
            "-qp_i", "23",
            "-qp_p", "23",
        ]
    elif encoder == "h264_qsv":
        encoder_args = [
            "-c:v", "h264_qsv",
            "-b:v", "2M",
            "-maxrate", "2M",
            "-bufsize", "4M",
        ]
    else:
        # CPU 回退
        encoder_args = [
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-maxrate", "2M",
            "-bufsize", "4M",
        ]

    print(f"[2/3] 编码 + HLS 封装...")
    cmd = [
        "ffmpeg", "-y",
        *hwaccel_args,
        "-i", input_path,
        "-vf", scale_filter,
        *encoder_args,
        "-c:a", "aac",
        "-b:a", "128k",
        "-ac", "2",
        "-hls_time", str(HLS_SEGMENT_TIME),
        "-hls_list_size", "0",
        "-hls_segment_filename", ts_pattern,
        "-hls_playlist_type", "vod",
        "-f", "hls",
        m3u8_path,
    ]
    print(f"  {' '.join(cmd)}")

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        # GPU 失败时自动回退 CPU
        if encoder != "libx264":
            print(f"[WARN] {encoder_label} 编码失败，回退 CPU 编码...")
            return process_video(input_path, output_dir, "libx264", "CPU (libx264)", [])
        print(f"[ERROR] ffmpeg 失败:\n{result.stderr}")
        sys.exit(1)

    ts_files = sorted(Path(output_dir).glob("segment_*.ts"))
    m3u8_size = os.path.getsize(m3u8_path)
    total_size = m3u8_size + sum(os.path.getsize(f) for f in ts_files)
    print(f"[INFO] 输出: {len(ts_files)} 分片, {total_size/1024/1024:.1f}MB")
    return m3u8_path


# ---------- 七牛上传 ----------
def upload_file(local_path: str, qiniu_key: str) -> tuple:
    """使用七牛 Python SDK 上传，支持断点续传、分片上传、自动重试"""
    from qiniu import Auth, put_file

    auth = Auth(QINIU_ACCESS_KEY, QINIU_SECRET_KEY)
    token = auth.upload_token(QINIU_BUCKET, qiniu_key, 3600)

    # put_file 自动判断文件大小选择直传或分片上传
    ret, info = put_file(
        token, qiniu_key, local_path,
        params={"x:a": "easyballot"},
        mime_type=None,
    )

    if ret is not None:
        return True, ret.get("key", qiniu_key)
    return False, str(info)


# ---------- 入口 ----------
def main():
    if len(sys.argv) < 2:
        print("用法: python convert_video.py <视频文件路径>")
        print("示例: python convert_video.py D:/videos/song.mp4")
        sys.exit(1)

    input_path = sys.argv[1]
    if not os.path.exists(input_path):
        print(f"[ERROR] 文件不存在: {input_path}")
        sys.exit(1)

    if not QINIU_ACCESS_KEY or not QINIU_SECRET_KEY:
        print("[ERROR] 请在 .env 中配置 QINIU_ACCESS_KEY 和 QINIU_SECRET_KEY")
        sys.exit(1)

    check_ffmpeg()

    encoder, encoder_label, hwaccel_args = detect_gpu_encoder()

    input_name = Path(input_path).stem
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    hls_prefix = f"easyballot/videos/{timestamp}_{input_name}"

    with tempfile.TemporaryDirectory() as tmpdir:
        print(f"\n{'='*50}")
        print(f"  处理: {os.path.basename(input_path)}")
        print(f"{'='*50}")

        m3u8_path = process_video(input_path, tmpdir, encoder, encoder_label, hwaccel_args)
        ts_files = sorted(Path(tmpdir).glob("segment_*.ts"))

        print(f"\n[3/3] 上传七牛 ({QINIU_BUCKET}, {QINIU_REGION})...")

        all_files = [m3u8_path] + [str(f) for f in ts_files]
        failed = 0

        for i, filepath in enumerate(all_files):
            fname = os.path.basename(filepath)
            qiniu_key = f"{hls_prefix}/{fname}"
            print(f"  [{i+1}/{len(all_files)}] {fname} ...", end=" ")
            ok, _ = upload_file(filepath, qiniu_key)
            print("OK" if ok else "FAILED")
            if not ok:
                failed += 1

        if failed > 0:
            print(f"\n[ERROR] {failed} 个文件上传失败")
            sys.exit(1)

    domain = QINIU_DOMAIN.rstrip("/")
    m3u8_url = f"{domain}/{hls_prefix}/index.m3u8"

    print(f"\n{'='*50}")
    print(f"  处理完成！")
    print(f"{'='*50}")
    print(f"  编码器: {encoder_label}")
    print(f"  HLS CDN 地址:")
    print(f"  {m3u8_url}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
