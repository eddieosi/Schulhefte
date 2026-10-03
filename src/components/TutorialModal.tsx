import React, { useState } from 'react';
import { 
  BookOpen, 
  PenTool, 
  Compass, 
  Search, 
  FileText, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  X,
  Type,
  Image as ImageIcon
} from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Willkommen bei Schulhefte',
      subtitle: 'Deine digitale Schultasche für Tablet & Browser',
      icon: BookOpen,
      iconColor: 'bg-blue-600 text-white',
      content: (
        <div className="space-y-3 text-stone-600 dark:text-stone-300 text-sm">
          <p>
            Schulhefte bringt das klassische Schulheft-Gefühl auf dein Tablet und Smartphone – optimiert für Stylus- und Stifteingabe mit echter Handballen-Erkennung.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
              <span className="font-semibold text-blue-900 dark:text-blue-300 block mb-1">Eigene Ordner</span>
              Jedes Heft besitzt seinen eigenen Datei-Ordner für Seiten, Bilder und OCR-Indizes.
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
              <span className="font-semibold text-amber-900 dark:text-amber-300 block mb-1">Docker & Offline</span>
              Vollständig offline nutzbar und mit 1 Klick auf eigenem Docker Server installierbar.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Schreiben, Malen & Hervorheben',
      subtitle: 'Präzise Stiftwerkzeuge für den Schulalltag',
      icon: PenTool,
      iconColor: 'bg-emerald-600 text-white',
      content: (
        <div className="space-y-3 text-stone-600 dark:text-stone-300 text-sm">
          <p>
            Wähle aus deinen Lieblings-Werkzeugen im oberen Menüband:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-md bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
              <div><strong>Füller / Stift:</strong> Exakter, gleichmäßiger Strich für saubere Heftaufschriebe.</div>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-md bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
              <div><strong>Pinsel:</strong> Druckempfindlicher Kalligraphie-Strich für Schönschrift und Zeichnungen.</div>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-md bg-yellow-400 text-yellow-900 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
              <div><strong>Textmarker:</strong> Fest auf <strong>50% Deckkraft</strong> kalibriert – der darunterliegende Text oder Karos bleiben immer kristallklar lesbar!</div>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-md bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
              <div><strong>Gerader Strich Modus:</strong> Begradigt unruhige Freihandstriche automatisch in perfekte Kanten.</div>
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: 'Geodreieck & Lineal',
      subtitle: 'Originalgetreue deutsche Geometriewerkzeuge',
      icon: Compass,
      iconColor: 'bg-amber-600 text-white',
      content: (
        <div className="space-y-3 text-stone-600 dark:text-stone-300 text-sm">
          <p>
            Schluss mit krummen Linien im Matheunterricht! Aktiviere das Geodreieck oder das Schullineal:
          </p>
          <div className="bg-yellow-50/80 dark:bg-yellow-950/30 p-3.5 rounded-xl border border-yellow-200/60 dark:border-yellow-900/60">
            <h4 className="font-bold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-1.5">
              <span>📐 Echtes Geodreieck</span>
            </h4>
            <p className="text-xs text-stone-600 dark:text-stone-300">
              Mit Nullpunkt-Zentrierung, Millimeter-Skala (-7 bis +7 cm), 45°-Winkeln, gelbem Gradbogen (10°–170°) und Mittellinie. Ziehe am Drehknopf, um jeden beliebigen Winkel einzustellen.
            </p>
          </div>
          <div className="bg-stone-100 dark:bg-stone-800 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
            <h4 className="font-bold text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-1.5">
              <span>📏 15cm Schullineal</span>
            </h4>
            <p className="text-xs text-stone-600 dark:text-stone-300">
              Movable & drehbar. Setze deinen Stift an der Kante an für exakte Koordinatensysteme und Randstriche.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Texte, Bilder & Lineaturen',
      subtitle: 'Flexibel wie Papier, mächtig wie ein Computer',
      icon: Type,
      iconColor: 'bg-indigo-600 text-white',
      content: (
        <div className="space-y-3 text-stone-600 dark:text-stone-300 text-sm">
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2.5">
              <Type className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <strong>Verschiebbare Textboxen:</strong> Klicke auf die Seite, um Text einzufügen. Wähle zwischen Druckschrift, Handschrift oder Serifenschrift.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <ImageIcon className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
              <div>
                <strong>Bilder einbinden:</strong> Fotos von Tafelbildern oder Arbeitsblättern direkt per Drag & Drop oder Klick einfügen, skalieren und beschriften.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <FileText className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong>Schullineaturen:</strong> Wähle pro Seite zwischen 5mm Mathe-Kariert, Grundschul-Kariert (7mm), Liniert mit rotem Korrekturrand, Vokabelheft (2 Spalten) oder Notenlinien.
              </div>
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: 'OCR-Volltextsuche & PDF-Export',
      subtitle: 'Finde jede handschriftliche Notiz sofort wieder',
      icon: Search,
      iconColor: 'bg-violet-600 text-white',
      content: (
        <div className="space-y-3 text-stone-600 dark:text-stone-300 text-sm">
          <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/50">
            <span className="font-semibold text-violet-900 dark:text-violet-300 block mb-1">OCR-Texterkennung</span>
            Klicke in einem Heft auf <strong>"OCR Erkennung"</strong>. Die intelligente Texterkennung liest deine Handschrift und indiziert sie, sodass du jedes Thema in der Suche sofort findest.
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50">
            <span className="font-semibold text-rose-900 dark:text-rose-300 block mb-1">PDF-Export</span>
            Exportiere dein gesamtes Schulheft als druckreifes DIN A4 PDF – perfekt zum Abgeben bei Lehrern oder Teilen mit Mitschülern!
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];
  const IconComponent = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-stone-900 shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-stone-100 dark:border-stone-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${current.iconColor}`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                {current.title}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {current.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {current.content}
        </div>

        {/* Footer / Navigation */}
        <div className="p-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/30 flex items-center justify-between">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentStep 
                    ? 'w-6 bg-blue-600' 
                    : 'w-2 bg-stone-300 dark:bg-stone-700 hover:bg-stone-400'
                }`}
                title={`Schritt ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Zurück</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="flex items-center gap-1 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition"
              >
                <span>Weiter</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition"
              >
                <Check className="w-4 h-4" />
                <span>App starten</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
