/**
 * Ejemplo de contenido complejo dentro de la columna JSONB `content`.
 * Puedes anidar objetos y arreglos sin agregar columnas a la tabla.
 */
export type RegistroAcademico = {
  folio: string;
  nombreCompleto: string;
  correo: string;
  programa: string;
  semestre: number;
  estatus: "pendiente" | "validado" | "rechazado";
  promedio: number;
  documentacion: {
    identificacion: boolean;
    actaNacimiento: boolean;
    certificadoEstudios: boolean;
  };
  contacto: {
    telefono: string;
    direccion: {
      calle: string;
      ciudad: string;
      estado: string;
      codigoPostal: string;
    };
  };
  etiquetas: string[];
};
