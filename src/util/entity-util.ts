import StringUtil from './string-util.js';
import deburr from './lodash/deburr.js';

export default class EntityUtil {
  public static match(item: any, ref: Item & any): boolean {
    return (
      StringUtil.getSimpleName(item.name) ===
        StringUtil.getSimpleName(ref.name) ||
      StringUtil.getSimpleName(item.name) ===
        StringUtil.getSimpleName(ref.data.originalName)
    );
  }

  public static toSelectOption(
    items: (Item.Data & any)[]
  ): { [key: string]: string } {
    if (items == null) {
      return {};
    }
    const map: { [key: string]: string } = {};
    for (let item of items) {
      if (map[item._id] == null) {
        map[item._id] = item.displayName ?? item.name;
      }
    }
    return map;
  }

  public static toSelectOptionGroup(items: {
    [group: string]: (Item.Data & any)[];
  }): { [group: string]: { [key: string]: string } } {
    if (items == null) {
      return {};
    }
    const map: { [group: string]: { [key: string]: string } } = {};
    for (let group of Object.keys(items)) {
      map[group] = this.toSelectOption(items[group]);
    }
    return map;
  }

  public static toMinimalName(value: string): string {
    let result = deburr(value).toLowerCase().trim();
    result = result.replace(/\s/g, '');
    result = result.replace(/\(/g, '');
    result = result.replace(/\)/g, '');
    return result;
  }

  public static find(name: string, entities: Item[]): Item.Data | null {
    if (name == null || entities?.length <= 0) {
      return null;
    }
    const matchName = StringUtil.toDeburrLowerCase(name).trim();
    let result = entities.find(
      (e: Item & any) =>
        StringUtil.equalsDeburrIgnoreCase(e.name.trim(), matchName) ||
        StringUtil.equalsDeburrIgnoreCase(
          e.data.originalName?.trim(),
          matchName
        )
    );
    if (result == null) {
      const simpleMatchName = StringUtil.toDeburrLowerCase(
        StringUtil.getSimpleName(name)
      ).trim();
      result = entities.find(
        (e: Item & any) =>
          StringUtil.equalsDeburrIgnoreCase(
            StringUtil.getSimpleName(e.name).trim(),
            simpleMatchName
          ) ||
          StringUtil.equalsDeburrIgnoreCase(
            StringUtil.getSimpleName(e.data.originalName)?.trim(),
            simpleMatchName
          )
      );
    }
    if (result != null) {
      const data = duplicate(result.data);
      data.name = name;
      return data;
    }
    return null;
  }
}
