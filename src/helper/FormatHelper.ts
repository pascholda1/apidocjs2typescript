export function toValidInterfaceName(name: string): string {
  return name
      .split(/\W/)
      .map(word => word.substring(0, 1).toUpperCase() + word.substring(1))
      .join('');
}
