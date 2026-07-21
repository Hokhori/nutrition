import type { Metadata } from "next";
import { getOperator, LEGAL_VERSION, MIN_AGE } from "@/lib/legal";

export const metadata: Metadata = { title: "Conditions générales d’utilisation — Nutrition" };
export const dynamic = "force-dynamic";

export default function CguPage() {
  const op = getOperator();
  return (
    <article className="legal-prose">
      <h1 className="text-2xl font-bold">Conditions générales d’utilisation</h1>
      <p className="muted">Dernière mise à jour : {LEGAL_VERSION}</p>

      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent l’utilisation du service {op.siteName} (« le Service »),
        édité par {op.name}. En créant un compte, vous les acceptez sans réserve.
      </p>

      <h2>2. Nature du service — avertissement santé</h2>
      <p>
        Le Service est un <strong>outil de bien-être et de suivi personnel</strong>. Il{" "}
        <strong>ne constitue pas un avis médical, nutritionnel ou diététique</strong>, n’établit
        aucun diagnostic et ne remplace pas la consultation d’un professionnel de santé. Les
        objectifs caloriques et recommandations affichés sont purement indicatifs et calculés par
        des formules générales qui ne tiennent pas compte de votre situation médicale
        individuelle.
      </p>
      <p>
        <strong>
          Consultez un médecin ou un diététicien avant d’entreprendre un régime, un programme de
          perte ou de prise de poids, ou une activité physique intense
        </strong>
        , en particulier en cas de grossesse, de trouble du comportement alimentaire, de pathologie
        chronique ou de traitement en cours. En cas d’urgence, contactez les services d’urgence.
      </p>

      <h2>3. Accès et compte</h2>
      <ul>
        <li>Le Service est réservé aux personnes d’au moins {MIN_AGE} ans.</li>
        <li>
          Vous êtes responsable de la confidentialité de vos identifiants et de votre jeton d’accès
          (token MCP / OAuth), et de toute activité réalisée depuis votre compte.
        </li>
        <li>
          L’inscription peut être soumise à validation par un administrateur selon la configuration
          de l’instance.
        </li>
      </ul>

      <h2>4. Utilisation acceptable</h2>
      <p>Vous vous engagez à ne pas :</p>
      <ul>
        <li>utiliser le Service à des fins illicites ou pour porter atteinte aux droits d’autrui ;</li>
        <li>tenter d’accéder aux données d’autres utilisateurs ou de compromettre la sécurité ;</li>
        <li>
          publier dans le catalogue d’aliments partagé ou via la contribution OpenFoodFacts des
          contenus erronés, illicites ou des données personnelles de tiers.
        </li>
      </ul>

      <h2>5. Contenu que vous fournissez</h2>
      <p>
        Vous conservez la responsabilité des données que vous enregistrez. Les aliments que vous
        ajoutez au <strong>catalogue partagé</strong> sont visibles par les autres utilisateurs de
        l’instance ; n’y insérez aucune information personnelle.
      </p>

      <h2>6. Disponibilité et absence de garantie</h2>
      <p>
        Le Service est fourni « en l’état », sans garantie de disponibilité continue, d’absence
        d’erreur ni d’exactitude des données nutritionnelles (issues notamment de sources tierces
        comme OpenFoodFacts). Il peut être interrompu, modifié ou arrêté à tout moment.
      </p>

      <h2>7. Limitation de responsabilité</h2>
      <p>
        Dans les limites autorisées par la loi, l’éditeur ne saurait être tenu responsable des
        conséquences de l’usage du Service, notamment des choix alimentaires, sportifs ou de santé
        que vous feriez sur la base des informations affichées. Aucune disposition des présentes ne
        limite la responsabilité qui ne peut l’être légalement (notamment envers les
        consommateurs).
      </p>

      <h2>8. Données personnelles</h2>
      <p>
        Le traitement de vos données est décrit dans la{" "}
        <a href="/legal/confidentialite">politique de confidentialité</a>, qui fait partie
        intégrante des présentes conditions.
      </p>

      <h2>9. Résiliation</h2>
      <p>
        Vous pouvez supprimer votre compte à tout moment depuis votre profil. L’éditeur peut
        suspendre ou clôturer un compte en cas de manquement aux présentes conditions.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Les présentes conditions sont régies par le droit de la {op.jurisdiction}. Les litiges
        relèvent des juridictions compétentes de ce ressort, sous réserve des règles protectrices
        des consommateurs.
      </p>
    </article>
  );
}
