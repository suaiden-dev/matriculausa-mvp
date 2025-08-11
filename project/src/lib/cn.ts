// Pequena utilidade para mesclar classes, inspirada no util `cn` do shadcn/ui
// Mantemos sem dependências externas para evitar mudanças no package.json.

export function cn(...classes: Array<string | undefined | null | false>): string {
  return classes.filter(Boolean).join(" ");
}


