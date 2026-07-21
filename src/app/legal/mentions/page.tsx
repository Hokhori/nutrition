import type { Metadata } from "next";
import { getOperator, LEGAL_VERSION } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales — Nutrition" };
// Lit l'identité de l'exploitant depuis l'environnement à l'exécution (pas au build).
export const dynamic = "force-dynamic";

export default function MentionsPage() {
  const op = getOperator();
  return (
    <article className="legal-prose">
      <h1 className="text-2xl font-bold">Mentions légales</h1>
      <p className="muted">Dernière mise à jour : {LEGAL_VERSION}</p>

      <h2>Éditeur du service</h2>
      <p>
        Le service <strong>{op.siteName}</strong>, accessible à l’adresse{" "}
        <a href={op.publicUrl}>{op.publicUrl}</a>, est édité par :
      </p>
      <ul>
        <li>
          <strong>{op.name}</strong>
        </li>
        <li>Adresse : {op.address}</li>
        <li>
          Contact : <a href={`mailto:${op.email}`}>{op.email}</a>
        </li>
        <li>Numéro d’entreprise (BCE/KBO) : {op.legalId}</li>
        {op.vat ? <li>N° de TVA : {op.vat}</li> : null}
      </ul>

      <h2>Hébergement</h2>
      <p>
        L’application et ses données sont hébergées par : <strong>{op.hosting}</strong>.
      </p>

      <h2>Objet du service</h2>
      <p>
        {op.siteName} est un outil de <strong>bien-être</strong> permettant de suivre ses apports
        caloriques, ses macronutriments, son poids et son activité physique, et d’en déduire un
        objectif calorique journalier indicatif. Il ne s’agit <strong>pas</strong> d’un dispositif
        médical au sens du règlement (UE) 2017/745, et il ne fournit aucun diagnostic ni traitement
        (voir les <a href="/legal/cgu">conditions générales d’utilisation</a>).
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le code source de l’application est publié sous licence libre <strong>AGPL-3.0</strong> et
        disponible sur son dépôt public. Les données nutritionnelles proviennent notamment
        d’<a href="https://openfoodfacts.org" target="_blank" rel="noreferrer">OpenFoodFacts</a>{" "}
        (licence Open Database License). Les marques et contenus de tiers restent la propriété de
        leurs titulaires respectifs.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement de vos données personnelles — y compris des <strong>données de santé</strong>{" "}
        (poids, apports, objectifs) — est décrit dans la{" "}
        <a href="/legal/confidentialite">politique de confidentialité</a>. Vous y trouverez vos
        droits et les moyens de les exercer.
      </p>

      <h2>Droit applicable</h2>
      <p>
        Le présent service est régi par le droit de la <strong>{op.jurisdiction}</strong>. Tout
        litige relève de la compétence des juridictions de ce ressort, sans préjudice des règles
        protectrices applicables aux consommateurs.
      </p>
    </article>
  );
}
