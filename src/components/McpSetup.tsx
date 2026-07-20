"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw, Monitor, Smartphone } from "lucide-react";

function useCopy() {
  return async (value: string, label = "Copié") => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      toast.error("Copie impossible");
    }
  };
}

function Field({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const copy = useCopy();
  return (
    <div>
      <div className="mb-1 text-xs text-[color:var(--color-muted)]">{label}</div>
      <div className="flex items-stretch gap-2">
        <code
          className={`min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-[color:var(--color-surface-2)] px-3 py-2 text-sm ${
            mono ? "font-mono" : ""
          }`}
        >
          {value}
        </code>
        <button onClick={() => copy(value, `${label} copié`)} className="btn-ghost rounded-lg px-2" aria-label="Copier">
          <Copy size={16} />
        </button>
      </div>
    </div>
  );
}

export function McpSetup({
  mcpUrl,
  mcpToken: initialToken,
  oauthClientId,
  oauthClientSecret,
}: {
  mcpUrl: string;
  mcpToken: string;
  oauthClientId: string;
  oauthClientSecret: string;
}) {
  const [token, setToken] = useState(initialToken);
  const [regenerating, setRegenerating] = useState(false);
  const copy = useCopy();

  const cliCommand = `claude mcp add --transport http nutrition ${mcpUrl} --header "Authorization: Bearer ${token}"`;

  async function regenerate() {
    if (!confirm("Régénérer le token invalidera l'ancien (à reconfigurer partout). Continuer ?")) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/profile/mcp-token", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setToken(data.mcpToken);
      toast.success("Nouveau token généré");
    } catch {
      toast.error("Échec de la régénération");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="card space-y-5 p-4">
      <div>
        <h2 className="font-semibold">Configurer MCP</h2>
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">
          Branche Claude sur ton suivi nutritionnel pour logger tes repas et consulter tes stats
          par conversation.
        </p>
      </div>

      <Field label="URL du serveur MCP" value={mcpUrl} />

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-[color:var(--color-muted)]">Ton token personnel</span>
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="flex items-center gap-1 text-xs text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
          >
            <RefreshCw size={12} /> Régénérer
          </button>
        </div>
        <div className="flex items-stretch gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-[color:var(--color-surface-2)] px-3 py-2 font-mono text-sm">
            {token}
          </code>
          <button onClick={() => copy(token, "Token copié")} className="btn-ghost rounded-lg px-2" aria-label="Copier">
            <Copy size={16} />
          </button>
        </div>
      </div>

      {/* PC */}
      <div className="border-t border-[color:var(--color-border)] pt-4">
        <div className="mb-2 flex items-center gap-2 font-medium">
          <Monitor size={16} /> Sur PC (Claude Code)
        </div>
        <p className="mb-2 text-sm text-[color:var(--color-muted)]">
          Colle cette commande dans ton terminal :
        </p>
        <div className="flex items-stretch gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-[color:var(--color-surface-2)] px-3 py-2 font-mono text-xs">
            {cliCommand}
          </code>
          <button onClick={() => copy(cliCommand, "Commande copiée")} className="btn-ghost rounded-lg px-2" aria-label="Copier">
            <Copy size={16} />
          </button>
        </div>
      </div>

      {/* Téléphone */}
      <div className="border-t border-[color:var(--color-border)] pt-4">
        <div className="mb-2 flex items-center gap-2 font-medium">
          <Smartphone size={16} /> Sur téléphone (app Claude)
        </div>
        <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-[color:var(--color-muted)]">
          <li>Réglages → Connecteurs → Ajouter un connecteur personnalisé</li>
          <li>URL : l’URL du serveur MCP ci-dessus</li>
          <li>Dans les paramètres avancés, colle le Client ID et le Client Secret ci-dessous</li>
          <li>Enregistre, puis « Se connecter » et autorise avec <b>ton email + mot de passe</b></li>
        </ol>
        <div className="space-y-3">
          <Field label="OAuth Client ID" value={oauthClientId} />
          <Field label="OAuth Client Secret" value={oauthClientSecret} />
        </div>
        <p className="mt-2 text-xs text-[color:var(--color-muted)]">
          Nécessite un abonnement Claude Pro/Max. Le Client ID/Secret est commun ; c’est ton
          email + mot de passe à l’étape d’autorisation qui relie le connecteur à <b>ton</b> compte.
        </p>
      </div>
    </div>
  );
}
