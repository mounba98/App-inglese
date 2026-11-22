import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import json, tempfile
from genera_audio import testo_da_leggere, raccogli_item, genera


class TestoDaLeggere(unittest.TestCase):
    def test_trattino_diventa_virgola(self):
        self.assertEqual(testo_da_leggere("A — apple"), "A, apple")

    def test_frase_invariata(self):
        self.assertEqual(testo_da_leggere("I'm fine, thank you"), "I'm fine, thank you")

    def test_spazi_normalizzati(self):
        self.assertEqual(testo_da_leggere("  E  —  egg "), "E, egg")

    def test_piu_trattini(self):
        self.assertEqual(testo_da_leggere("a — b — c"), "a, b, c")


class RaccogliItem(unittest.TestCase):
    def test_raccoglie_da_livelli_e_argomenti(self):
        lv = [{"lessons": [{"items": [{"id": "x", "en": "hi"}]}]}]
        tp = [{"lessons": [{"items": [{"id": "y", "en": "yo"}]}]}]
        self.assertEqual(raccogli_item(lv, tp), [("x", "hi"), ("y", "yo")])

    def test_teoria_della_lezione_ha_il_suo_file(self):
        lv = [{"lessons": [{"id": "l9-01", "teoria": {"it": "ciao", "en": "Say — hello"},
                            "items": [{"id": "l9-01-a", "en": "hi"}]},
                           {"id": "l9-02", "items": [{"id": "l9-02-a", "en": "yo"}]}]}]
        self.assertEqual(
            raccogli_item(lv, []),
            [("l9-01-a", "hi"), ("l9-01-teoria", "Say — hello"), ("l9-02-a", "yo")],
        )


class Genera(unittest.TestCase):
    def test_item_che_fallisce_e_saltato(self):
        def synth(iid, text, mp3):
            if iid == "b":
                raise RuntimeError("boom")
            mp3.write_bytes(b"x")
        with tempfile.TemporaryDirectory() as d:
            index, failed = genera([("a", "hi"), ("b", "yo"), ("c", "A — apple")], synth, Path(d))
            self.assertEqual(index, {"a": "a.mp3", "c": "c.mp3"})
            self.assertEqual(failed, ["b"])
            self.assertEqual(json.loads((Path(d) / "index.json").read_text()), index)

    def test_teoria_passa_da_testo_da_leggere_e_va_nell_indice(self):
        letti = {}
        def synth(iid, text, mp3):
            letti[iid] = text
            mp3.write_bytes(b"x")
        lv = [{"lessons": [{"id": "l9-01", "teoria": {"it": "x", "en": "Say — hello"}, "items": [{"id": "l9-01-a", "en": "hi"}]}]}]
        with tempfile.TemporaryDirectory() as d:
            index, _ = genera(raccogli_item(lv, []), synth, Path(d))
        self.assertEqual(index["l9-01-teoria"], "l9-01-teoria.mp3")
        self.assertEqual(letti["l9-01-teoria"], "Say, hello")

    def test_tutti_falliti_indice_vuoto(self):
        def synth(*a):
            raise RuntimeError("x")
        with tempfile.TemporaryDirectory() as d:
            index, failed = genera([("a", "hi")], synth, Path(d))
            self.assertEqual(index, {})
            self.assertEqual(failed, ["a"])


if __name__ == "__main__":
    unittest.main()
