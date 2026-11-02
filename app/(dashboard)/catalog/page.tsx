import { getServerSession } from "@processes/auth/session";
import CatalogManager from "@features/catalog/ui/CatalogManager";

export default async function CatalogPage() {
  const session = await getServerSession();
  if (
    !session.authenticated ||
    !session.user ||
    !["admin", "administrator"].includes(session.user.role)
  ) {
    return (
      <p role="alert">Catalog management requires an administrator account.</p>
    );
  }
  return <CatalogManager />;
}
