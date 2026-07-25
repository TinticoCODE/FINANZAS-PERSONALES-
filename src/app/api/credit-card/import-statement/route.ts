import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { processCreditCardStatementPdf } from "@/domain/credit/credit-card-statement-pdf.service";
import { getSession } from "@/lib/session";

function revalidateFinancePaths() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/cards");
  revalidatePath("/reports");
}

/**
 * POST /api/credit-card/import-statement
 * multipart/form-data: creditCardId, pdf, password? (opcional)
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const creditCardId = formData.get("creditCardId");
    const file = formData.get("pdf");
    const password = formData.get("password");

    if (typeof creditCardId !== "string" || !creditCardId) {
      return NextResponse.json(
        { ok: false, error: "creditCardId es requerido" },
        { status: 400 }
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { ok: false, error: "Archivo PDF requerido" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processCreditCardStatementPdf({
      creditCardId,
      buffer,
      password: typeof password === "string" && password ? password : undefined,
    });

    if (!result.ok) {
      const status = result.error.includes("contraseña") ? 422 : 400;
      return NextResponse.json(result, { status });
    }

    revalidateFinancePaths();
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/credit-card/import-statement failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error al importar extracto",
      },
      { status: 500 }
    );
  }
}
