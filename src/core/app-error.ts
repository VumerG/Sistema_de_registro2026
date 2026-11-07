/**
 * Error controlado de la aplicación.
 *
 * La capa HTTP lo traduce a una respuesta JSON con el código indicado.
 * Cualquier otro error se considera inesperado y no se expone al navegador.
 */
export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}
