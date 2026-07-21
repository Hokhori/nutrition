import { getSession, getSessionUser } from "@/lib/auth";
import { unauthorized, errorResponse } from "@/lib/api-guard";
import { deleteUser, countAdmins } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Suppression du compte (RGPD art. 17, droit à l'effacement).
 * Supprime l'utilisateur ; les journaux (apports, poids, activités, réglages)
 * sont supprimés en cascade et les aliments contribués sont anonymisés
 * (createdBy → NULL). La session est détruite.
 */
export async function DELETE() {
  const su = await getSessionUser();
  if (!su) return unauthorized();

  // Garde-fou : ne pas laisser l'instance sans administrateur.
  if (su.role === "admin" && (await countAdmins()) <= 1) {
    return Response.json(
      {
        error:
          "Vous êtes le seul administrateur. Nommez un autre administrateur avant de supprimer ce compte.",
      },
      { status: 409 },
    );
  }

  try {
    await deleteUser(su.userId);
    const session = await getSession();
    session.destroy();
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
