import ReferentialUtil from './referential-util.js';
import StringUtil from './string-util.js';
import RandomUtil from './random-util.js';

export default class TrappingUtil {
  public static readonly UPDATE_QUANTITY_KEY = 'data.quantity.value';
  public static readonly UPDATE_SKILL_NAME_KEY = 'name';

  public static async generateMoney(actor: Actor) {
    if (actor == null) {
      return;
    }

    const actorStatus = (<any>actor.data?.data)?.details?.status?.value;

    const statusTiers: {
      [key: string]: string;
    } = ReferentialUtil.getStatusTiers();

    const status = actorStatus?.split(' ')[0];
    const tierStr = actorStatus?.split(' ')[1];
    let tier: number =
      tierStr != null && Number.isNumeric(tierStr) ? Number(tierStr) : -1;
    let statusKey = null;
    Object.entries(statusTiers)?.forEach(([key, value]) => {
      if (value === status) {
        statusKey = key;
      }
    });

    if (tier < 0) {
      tier = RandomUtil.getRandomValue([1, 2, 3, 4, 5]);
    }

    if (statusKey == null) {
      statusKey = RandomUtil.getRandomValue(['g', 's', 'b']);
    }

    let gold = 0;
    let silver = 0;
    let brass;

    if (statusKey === 'g') {
      gold = tier;
      silver = new Roll('5d10').roll().total;
      brass = new Roll('10d10').roll().total;
    } else if (statusKey === 's') {
      silver = new Roll(`${tier}d10`).roll().total;
      brass = new Roll('10d10').roll().total;
    } else {
      brass = new Roll(`${2 * tier}d10`).roll().total;
    }

    const moneyItems = await ReferentialUtil.getAllMoneyItems();
    let coins = (<any>actor.data)?.money?.coins;
    let gCoin = coins.find((c: any) => c.data?.coinValue?.value === 240);
    let sCoin = coins.find((c: any) => c.data?.coinValue?.value === 12);
    let bCoin = coins.find((c: any) => c.data?.coinValue?.value === 1);

    const isGoldCreate = gCoin == null;
    const isSilverCreate = sCoin == null;
    const isBrassCreate = bCoin == null;

    const createGCoin = moneyItems[0];
    const createSCoin = moneyItems[1];
    const createBCoin = moneyItems[2];

    if (gold > 0 || isGoldCreate) {
      if (isGoldCreate) {
        (<any>createGCoin.data).quantity.value = gold;
        await actor.createOwnedItem(createGCoin);
      } else {
        await actor.updateOwnedItem({
          _id: gCoin._id,
          [this.UPDATE_QUANTITY_KEY]: gold + gCoin.data.quantity.value,
        });
      }
    }

    if (silver > 0 || isSilverCreate) {
      if (isSilverCreate) {
        (<any>createSCoin.data).quantity.value = silver;
        await actor.createOwnedItem(createSCoin);
      } else {
        await actor.updateOwnedItem({
          _id: sCoin._id,
          [this.UPDATE_QUANTITY_KEY]: silver + sCoin.data.quantity.value,
        });
      }
    }

    if (brass > 0 || isBrassCreate) {
      if (isBrassCreate) {
        (<any>createBCoin.data).quantity.value = brass;
        await actor.createOwnedItem(createBCoin);
      } else {
        await actor.updateOwnedItem({
          _id: bCoin._id,
          [this.UPDATE_QUANTITY_KEY]: brass + bCoin.data.quantity.value,
        });
      }
    }

    let money = duplicate((<any>actor.data)?.money?.coins);
    money = game.wfrp4e.market.consolidateMoney(money);
    await actor.updateOwnedItem(money);
  }

  public static async generateWeapons(actor: Actor) {
    if (actor == null) {
      return;
    }

    const groups: string[] = [];

    const weaponSkills: Item.Data[] = (<any>actor.data)?.skills
      ?.filter(
        (i: Item.Data) =>
          i.name.includes('(') &&
          (StringUtil.includesDeburrIgnoreCase(
            i.name,
            ReferentialUtil.getWeaponTypes().melee
          ) ||
            StringUtil.includesDeburrIgnoreCase(
              i.name,
              ReferentialUtil.getWeaponTypes().ranged
            ))
      )
      .sort((s1: Item.Data, s2: Item.Data) => {
        const s1HaveAny = StringUtil.includesDeburrIgnoreCase(
          s1.name,
          game.i18n.localize('WFRP4NPCGEN.item.any')
        );
        const s2HaveAny = StringUtil.includesDeburrIgnoreCase(
          s2.name,
          game.i18n.localize('WFRP4NPCGEN.item.any')
        );
        if (s1HaveAny && s2HaveAny) {
          return 0;
        } else if (s1HaveAny) {
          return 1;
        } else if (s2HaveAny) {
          return -1;
        }
        return 0;
      });
    for (let skill of weaponSkills) {
      const isMelee = StringUtil.includesDeburrIgnoreCase(
        skill.name,
        ReferentialUtil.getWeaponTypes().melee
      );
      let group = skill.name.substring(
        skill.name.indexOf('(') + 1,
        skill.name.indexOf(')')
      );
      let replaceSkill = false;
      if (
        !StringUtil.arrayIncludesDeburrIgnoreCase(
          ReferentialUtil.getWeaponGroups(),
          group
        )
      ) {
        group = RandomUtil.getRandomValue(
          isMelee
            ? ReferentialUtil.getMeleeWeaponGroups()
            : ReferentialUtil.getRangedWeaponGroups(),
          groups
        );
        if (group == null) {
          group = ReferentialUtil.getBasicWeaponGroups();
        }
        console.warn(
          `Unknown weapon group from skill ${skill.name}, resolved by random ${group}`
        );
        replaceSkill = true;
      }

      const existingCount = (<any>actor.data)?.weapons?.filter((w: any) =>
        StringUtil.equalsDeburrIgnoreCase(w.weaponGroup, group)
      )?.length;

      const ignore =
        (StringUtil.equalsDeburrIgnoreCase(
          group,
          ReferentialUtil.getBasicWeaponGroups()
        ) &&
          existingCount > 1) ||
        existingCount > 0;

      if (!ignore && !groups.includes(group)) {
        groups.push(group);
        if (replaceSkill) {
          await actor.updateOwnedItem({
            _id: skill._id,
            [this.UPDATE_SKILL_NAME_KEY]: `${
              isMelee
                ? ReferentialUtil.getWeaponTypes().melee
                : ReferentialUtil.getWeaponTypes().ranged
            } (${group})`,
          });
        }
      }
    }
    if (groups.length > 0) {
      const weapons = (await ReferentialUtil.getTrappingEntities(true)).filter(
        (w) => w.type === 'weapon'
      );

      for (let group of groups) {
        const randomWeapon = RandomUtil.getRandomValue(
          weapons.filter((w) =>
            StringUtil.equalsDeburrIgnoreCase(
              (<any>w.data.data)?.weaponGroup?.value,
              ReferentialUtil.getWeaponGroupsKey(group)
            )
          )
        );

        await actor.createOwnedItem(randomWeapon.data);
      }
    }

    if ((<any>actor.data)?.weapons?.length > 0) {
      const ammunitions = (
        await ReferentialUtil.getTrappingEntities(true)
      ).filter((w) => w.type === 'ammunition');

      for (let weapons of (<any>actor.data)?.weapons) {
        const ammunitionGroup = (<any>weapons.data)?.ammunitionGroup?.value;
        if (ammunitionGroup != null) {
          const randomAmmunition = RandomUtil.getRandomValue(
            ammunitions.filter((w) =>
              StringUtil.equalsDeburrIgnoreCase(
                (<any>w.data.data)?.ammunitionType?.value,
                ammunitionGroup
              )
            )
          );
          if (randomAmmunition != null) {
            const quantity = (<any>randomAmmunition.data.data)?.quantity?.value;
            if (quantity != null && quantity < 10) {
              (<any>randomAmmunition.data.data).quantity.value = 10;
            }
            await actor.createOwnedItem(randomAmmunition.data);
          }
        }
      }
    }
  }
}
