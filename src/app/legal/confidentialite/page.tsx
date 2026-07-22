import type { Metadata } from "next";
import { getOperator, assistantEnabled, offContributionEnabled, LEGAL_VERSION, MIN_AGE } from "@/lib/legal";

export const metadata: Metadata = { title: "Politique de confidentialité — Nutrition" };
export const dynamic = "force-dynamic";

export default function ConfidentialitePage() {
  const op = getOperator();
  const ai = assistantEnabled();
  const off = offContributionEnabled();
  const contact = op.dpo || op.email;

  return (
    <article className="legal-prose">
      <h1 className="text-2xl font-bold">Politique de confidentialité</h1>
      <p className="muted">Dernière mise à jour : {LEGAL_VERSION} · Conforme au RGPD (UE 2016/679)</p>

      <p>
        Cette politique explique quelles données personnelles {op.siteName} collecte, pourquoi,
        combien de temps elles sont conservées, avec qui elles sont partagées, et quels sont vos
        droits. Elle concerne notamment des <strong>données de santé</strong>, qui bénéficient d’une
        protection renforcée (article 9 du RGPD).
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        <strong>{op.name}</strong>, {op.address}. Contact pour toute question relative à vos
        données : <a href={`mailto:${contact}`}>{contact}</a>
        {op.dpo ? " (délégué à la protection des données / point de contact RGPD)." : "."}
      </p>

      <h2>2. Données que nous traitons</h2>
      <ul>
        <li>
          <strong>Compte</strong> : adresse email, mot de passe (stocké sous forme de hachage,
          jamais en clair), rôle, date de création, preuve de consentement.
        </li>
        <li>
          <strong>Données de santé et de bien-être</strong> : poids et historique de pesées,
          apports alimentaires (aliments, quantités, macronutriments), activité physique, sexe,
          année de naissance, taille, objectifs de poids et cibles caloriques.
        </li>
        <li>
          <strong>Techniques</strong> : cookie de session strictement nécessaire à
          l’authentification, journaux techniques du serveur (adresse IP, horodatage) à des fins de
          sécurité et de bon fonctionnement.
        </li>
      </ul>

      <h2>3. Finalités et bases légales</h2>
      <table>
        <thead>
          <tr>
            <th>Finalité</th>
            <th>Base légale (RGPD)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Créer et gérer votre compte, vous authentifier</td>
            <td>Exécution du contrat (art. 6.1.b)</td>
          </tr>
          <tr>
            <td>Suivre vos apports, poids, activité et calculer vos objectifs (données de santé)</td>
            <td>
              <strong>Consentement explicite (art. 9.2.a)</strong>, recueilli à l’inscription et
              retirable à tout moment
            </td>
          </tr>
          <tr>
            <td>Assurer la sécurité, prévenir les abus, tenir les journaux techniques</td>
            <td>Intérêt légitime (art. 6.1.f)</td>
          </tr>
          <tr>
            <td>Respecter nos obligations légales (le cas échéant)</td>
            <td>Obligation légale (art. 6.1.c)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Le traitement de vos données de santé repose sur votre <strong>consentement explicite</strong>.
        Vous pouvez le retirer à tout moment (voir §7) ; le retrait n’affecte pas la licéité du
        traitement effectué avant celui-ci et entraîne en pratique la suppression de votre compte.
      </p>

      <h2>4. Destinataires et sous-traitants</h2>
      <p>Nous ne vendons pas vos données. Elles sont partagées uniquement avec les prestataires nécessaires au service :</p>
      <ul>
        <li>
          <strong>Hébergeur</strong> : {op.hosting} — stockage de l’application et de la base de
          données au sein de l’Union européenne.
        </li>
        {ai ? (
          <li>
            <strong>Anthropic, PBC (États-Unis)</strong> — fournit l’<strong>assistant IA in-app</strong>.
            Lorsque vous utilisez cet assistant intégré au site, le contenu de vos messages (par ex.
            la description de vos repas, votre poids) est transmis à Anthropic pour générer la
            réponse. Ce traitement fait l’objet d’un accord de sous-traitance (DPA, avec clauses
            contractuelles types) conclu par l’éditeur, et l’usage de vos données pour l’entraînement
            de modèles est désactivé. L’assistant IA est facultatif.
          </li>
        ) : null}
        <li>
          <strong>Connecteur MCP (à votre initiative)</strong> — si vous branchez votre propre
          assistant IA (par ex. l’application Claude, via votre abonnement personnel) sur le
          connecteur MCP de l’application, les données que vous consultez ou dictez transitent alors
          vers <strong>votre</strong> fournisseur d’IA, sous <strong>votre</strong> propre relation
          contractuelle avec lui. Ce traitement n’est <strong>pas</strong> couvert par le DPA de
          l’éditeur ni réalisé par l’application : il relève de vous et du fournisseur que vous
          choisissez. L’usage du MCP est entièrement facultatif.
        </li>
        {off ? (
          <li>
            <strong>OpenFoodFacts</strong> — base de données alimentaire ouverte. Les produits que
            vous contribuez y sont publiés publiquement ; n’y ajoutez aucune donnée personnelle.
          </li>
        ) : (
          <li>
            <strong>OpenFoodFacts</strong> — consulté en lecture pour importer des informations
            nutritionnelles de produits ; aucune de vos données personnelles ne lui est transmise.
          </li>
        )}
      </ul>

      {ai ? (
        <>
          <h2>5. Transferts hors Union européenne</h2>
          <p>
            L’usage de l’<strong>assistant IA in-app</strong> implique un transfert de données vers{" "}
            <strong>Anthropic aux États-Unis</strong>. Ce transfert, réalisé par l’éditeur, est
            encadré par les <strong>clauses contractuelles types</strong> de la Commission
            européenne (et, le cas échéant, le <em>Data Privacy Framework</em>), garantissant un
            niveau de protection approprié.
          </p>
          <p>
            Si vous utilisez le <strong>connecteur MCP</strong> avec votre propre assistant IA, le
            transfert éventuel hors UE dépend du fournisseur que <strong>vous</strong> choisissez et
            de vos propres conditions avec lui ; il n’est pas réalisé ni encadré par l’éditeur. En
            dehors de ces cas, vos données restent hébergées dans l’Union européenne.
          </p>
        </>
      ) : (
        <>
          <h2>5. Transferts hors Union européenne</h2>
          <p>
            Vos données sont hébergées et traitées au sein de l’Union européenne. Aucun transfert
            vers un pays tiers n’est réalisé.
          </p>
        </>
      )}

      <h2>6. Durée de conservation</h2>
      <ul>
        <li>
          Vos données de compte, de suivi et de santé sont conservées <strong>tant que votre compte
          existe</strong>.
        </li>
        <li>
          En cas de suppression de votre compte (depuis votre profil), l’ensemble de vos données
          personnelles est <strong>effacé</strong> ; les aliments que vous avez ajoutés au catalogue
          partagé sont anonymisés (dissociés de votre identité).
        </li>
        <li>Les journaux techniques de sécurité sont conservés pour une durée limitée.</li>
      </ul>

      <h2>7. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li>
          <strong>Accès et portabilité</strong> : consulter et exporter vos données dans un format
          lisible — bouton <em>« Exporter mes données »</em> dans votre profil.
        </li>
        <li>
          <strong>Rectification</strong> : corriger vos données directement dans l’application.
        </li>
        <li>
          <strong>Effacement</strong> : supprimer votre compte et vos données — bouton{" "}
          <em>« Supprimer mon compte »</em> dans votre profil.
        </li>
        <li>
          <strong>Retrait du consentement</strong> : à tout moment, sans effet rétroactif.
        </li>
        <li>
          <strong>Opposition et limitation</strong> du traitement.
        </li>
        <li>
          <strong>Réclamation</strong> auprès de l’autorité de contrôle. En Belgique :{" "}
          <a href="https://www.autoriteprotectiondonnees.be" target="_blank" rel="noreferrer">
            Autorité de protection des données
          </a>
          .
        </li>
      </ul>
      <p>
        Pour exercer un droit que l’application ne couvre pas directement, écrivez à{" "}
        <a href={`mailto:${contact}`}>{contact}</a>.
      </p>

      <h2>8. Décision automatisée</h2>
      <p>
        Les objectifs caloriques sont calculés par une formule (Mifflin-St Jeor) à titre purement
        indicatif. Ils ne produisent aucun effet juridique ni décision automatisée vous affectant au
        sens de l’article 22 du RGPD.
      </p>

      <h2>9. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles appropriées : chiffrement
        des échanges (HTTPS), hachage des mots de passe, cloisonnement des données par utilisateur,
        accès restreint. En cas de violation de données susceptible d’engendrer un risque pour vos
        droits, nous en informerons l’autorité de contrôle et, le cas échéant, les personnes
        concernées, dans les délais légaux.
      </p>

      <h2>10. Mineurs</h2>
      <p>
        Le service est réservé aux personnes âgées d’au moins <strong>{MIN_AGE} ans</strong>. Nous ne
        collectons pas sciemment de données concernant des enfants en dessous de cet âge.
      </p>

      <h2>11. Cookies</h2>
      <p>
        {op.siteName} n’utilise qu’un <strong>cookie strictement nécessaire</strong> au maintien de
        votre session authentifiée. Aucun cookie publicitaire ni traceur tiers n’est déposé ; aucune
        bannière de consentement n’est donc requise pour ce seul usage.
      </p>

      <h2>12. Modifications</h2>
      <p>
        Cette politique peut évoluer. La version en vigueur est datée en tête de page. En cas de
        modification substantielle, un nouveau consentement pourra vous être demandé.
      </p>
    </article>
  );
}
