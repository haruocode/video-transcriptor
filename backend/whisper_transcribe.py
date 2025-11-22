import sys
import whisper
import os

if len(sys.argv) < 2:
    print("Usage: python whisper_transcribe.py <mp3_path> [model]")
    sys.exit(1)

mp3_path = sys.argv[1]
if not os.path.exists(mp3_path):
    print(f"File not found: {mp3_path}")
    sys.exit(1)

model_name = sys.argv[2] if len(sys.argv) >= 3 else 'medium'
model = whisper.load_model(model_name)
result = model.transcribe(mp3_path)  # 言語自動判定に変更
print(result["text"])
