#!/usr/bin/env python3
"""Genera audio/<id>.mp3 con Piper per ogni item dei contenuti.

Uso: genera_audio.py OUT_DIR VOICE_ONNX
Un item che fallisce è saltato; esce con codice != 0 solo se non si genera nessun file.
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


def genera(items, synth, out_dir):
    """Genera i file; un item che fallisce viene saltato (resta fuori dall'indice)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    index, failed = {}, []
    for iid, en in items:
        try:
            synth(iid, testo_da_leggere(en), out_dir / f"{iid}.mp3")
            index[iid] = f"{iid}.mp3"
        except Exception as e:  # noqa: BLE001
            failed.append(iid)
            print(f"ATTENZIONE: {iid} saltato ({e}); l'app userà la voce del telefono", file=sys.stderr)
    (out_dir / "index.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    return index, failed


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
    with tempfile.TemporaryDirectory() as tmp:
        def synth(iid, text, mp3):
            wav = Path(tmp) / f"{iid}.wav"
            with wave.open(str(wav), "wb") as wf:
                voice.synthesize_wav(text, wf)
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
                 "-ac", "1", "-b:a", "64k", str(mp3)],
                check=True,
            )

        index, failed = genera(items, synth, out_dir)
    print(f"{len(index)} file generati, {len(failed)} saltati")
    return 0 if index else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
