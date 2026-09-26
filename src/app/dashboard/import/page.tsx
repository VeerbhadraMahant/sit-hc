import { ImportWorkspace } from "@/components/dashboard/import-workspace";

export const metadata = { title: "Import — Vocalyze HR" };

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="eyebrow">Offline channels</p>
        <h1 className="text-heading-md font-semibold text-obsidian">Import feedback</h1>
        <p className="mt-2 text-pewter">
          Bring paper and legacy feedback into Vocalyze. Photograph suggestion-box slips, handwritten notes or paper survey forms and AI
          will read them (OCR, any language), split them into separate entries, and analyse each one. Imported items are stored
          anonymously.
        </p>
      </div>
      <ImportWorkspace />
    </div>
  );
}
