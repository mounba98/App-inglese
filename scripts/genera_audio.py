#!/usr/bin/env python3
"""Genera audio/<id>.mp3 con Piper per ogni item dei contenuti.

Uso: genera_audio.py OUT_DIR VOICE_ONNX
Esce con codice != 0 se un item fallisce.
"""
import json
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def testo_da_leggere(en: str) -> str:
    t = re.sub(r"\s*—\s*", ", ", en)
    return re.sub(r"\s+", " ", t).strip()


def raccogli_item(levels, topics):
    out = []
    for group in list(levels) + list(topics):
        for lesson in group["lessons"]:
            for it in lesson["items"]:
                out.append((it["id"], it["en"]))
    return out


def main(argv):
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    out_dir, voice_path = Path(argv[1]), argv[2]
    from piper import PiperVoice

    voice = PiperVoice.load(voice_path)
    levels = json.loads((ROOT / "content/levels.json").read_text(encoding="utf-8"))
    topics = json.loads((ROOT / "content/topics.json").read_text(encoding="utf-8"))
    items = raccogli_item(levels, topics)
    out_dir.mkdir(parents=True, exist_ok=True)
    index, failed = {}, []
    with tempfile.TemporaryDirectory() as tmp:
        for iid, en in items:
            try:
                wav = Path(tmp) / f"{iid}.wav"
                with wave.open(str(wav), "wb") as wf:
                    voice.synthesize_wav(testo_da_leggere(en), wf)
                mp3 = out_dir / f"{iid}.mp3"
                subprocess.run(
                    ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
                     "-ac", "1", "-b:a", "64k", str(mp3)],
                    check=True,
                )
                index[iid] = f"{iid}.mp3"
            except Exception as e:  # noqa: BLE001
                failed.append(iid)
                print(f"ERRORE {iid}: {e}", file=sys.stderr)
    (out_dir / "index.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    print(f"{len(index)} file generati, {len(failed)} errori")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
