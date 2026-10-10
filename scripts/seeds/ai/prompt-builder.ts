import type {
  PensionAiPromptContext,
  ReviewAiPromptContext,
  RoomAiPromptContext,
} from '../types.js';

export const buildPensionDescriptionPrompt = (ctx: PensionAiPromptContext): string => {
  return `<|im_start|>system
Eres redactor inmobiliario estudiantil en Chile. Escribe una descripción atractiva de pensión universitaria (2 a 3 oraciones breves). Menciona la cercanía al campus y las comodidades reales. No uses títulos ni listas.
<|im_end|>
<|im_start|>user
Ciudad: ${ctx.city} (${ctx.neighborhood})
Universidad: ${ctx.nearestUniName} a ${ctx.walkingMinutes} min caminando
Habitaciones: ${ctx.roomsSummary}
Comodidades: ${ctx.amenitiesList.join(', ')}
Normas: ${ctx.rulesSummary}
Anfitrión: ${ctx.landlordName}
Descripción:
<|im_end|>
<|im_start|>assistant
`;
};

export const buildRoomPrompt = (ctx: RoomAiPromptContext): string => {
  const bath = ctx.hasPrivateBathroom ? 'con baño privado' : 'con baño compartido';
  return `<|im_start|>system
Eres redactor inmobiliario en Chile. Escribe una descripción breve y natural de 1 o 2 oraciones para una habitación de pensión universitaria.
<|im_end|>
<|im_start|>user
Tipo: ${ctx.roomType} ${bath}
Camas: ${ctx.totalBeds}
Ubicación: ${ctx.neighborhood}, ${ctx.city}
Descripción:
<|im_end|>
<|im_start|>assistant
`;
};

export const buildReviewCommentPrompt = (ctx: ReviewAiPromptContext): string => {
  const genderWord = ctx.authorGender === 'FEMALE' ? 'estudiante mujer' : 'estudiante hombre';
  return `<|im_start|>system
Eres un ${genderWord} en Chile. Escribe una reseña breve (1 o 2 oraciones) que exprese tu experiencia según tu calificación. Sé natural y conciso.
<|im_end|>
<|im_start|>user
Pensión en: ${ctx.city}, cerca de ${ctx.nearestUniName}
Estudiante: ${ctx.authorName}
Calificación: ${ctx.overallRating}/5 estrellas (estado de ánimo: ${ctx.sentiment})
Detalle vivido: ${ctx.highlightAspect}
Reseña:
<|im_end|>
<|im_start|>assistant
`;
};

export const cleanGeneratedResponse = (raw: string): string => {
  let cleaned = raw;
  const assistantMarker = '<|im_start|>assistant';
  const idx = cleaned.lastIndexOf(assistantMarker);
  if (idx !== -1) {
    cleaned = cleaned.substring(idx + assistantMarker.length);
  }
  cleaned = cleaned.replace(/<\|im_end\|>/g, '');
  cleaned = cleaned.replace(/<\|endoftext\|>/g, '');
  cleaned = cleaned.replace(/^[\r\n\s]+/, '').replace(/[\r\n\s]+$/, '');
  const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);
  const text = lines.join(' ').trim();

  const lastPunctuation = Math.max(
    text.lastIndexOf('.'),
    text.lastIndexOf('!'),
    text.lastIndexOf('?'),
  );
  if (lastPunctuation > 20) {
    return text.substring(0, lastPunctuation + 1).trim();
  }
  return text;
};
