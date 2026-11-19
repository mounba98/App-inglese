import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from genera_audio import testo_da_leggere, raccogli_item


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


if __name__ == "__main__":
    unittest.main()
