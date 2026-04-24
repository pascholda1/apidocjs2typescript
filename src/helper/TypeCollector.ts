export class TypeCollector {
  private readonly inline: boolean;
  private collected: Array<{name: string; body: string; isUnion: boolean}> = [];

  constructor(inline = false) {
    this.inline = inline;
  }

  register(proposedName: string, body: string, parentName: string, isUnion: boolean, forceUnique = false): string {
    if (this.inline) {
      return isUnion ? body : `{\n${body}\n}`;
    }

    if (!forceUnique) {
      const duplicate = this.collected.find(t => t.body === body && t.isUnion === isUnion);
      if (duplicate) {
        return duplicate.name;
      }
    }

    let name = proposedName;
    if (forceUnique || this.collected.some(t => t.name === name)) {
      name = `${parentName}${proposedName}`;
    }

    this.collected.push({name, body, isUnion});
    return name;
  }

  render(): string {
    return this.collected
        .map(({name, body, isUnion}) =>
            isUnion
            ? `export type ${name} = ${body};`
            : `export type ${name} = {\n${body}\n};`,
        )
        .join('\n\n');
  }
}
