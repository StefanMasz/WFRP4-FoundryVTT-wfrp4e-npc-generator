import CompendiumUtil from './util/compendium-util.js';
import CheckDependencies from './check-dependencies.js';
import CreatureModel from './creature-model.js';
import CreatureChooser from './util/creature-chooser.js';
import NameChooser from './util/name-chooser.js';
import ReferentialUtil from './util/referential-util.js';
import TranslateErrorDetect from './util/translate-error-detect.js';
import StringUtil from './util/string-util.js';
import EntityUtil from './util/entity-util.js';
import CreatureAbilitiesChooser from './util/creature-abilities-chooser.js';
import CreatureAbilities from './util/creature-abilities.js';
import CreatureTemplate from './util/creature-template.js';
import Options from './util/options.js';
import OptionsChooser from './util/options.chooser.js';
import WaiterUtil from './util/waiter-util.js';
import TrappingChooser from './util/trapping-chooser.js';
import MagicsChooser from './util/magics-chooser.js';
import MutationsChooser from './util/mutations-chooser.js';
import CreatureBuilder from './creature-builder.js';
import RandomUtil from './util/random-util.js';

export default class CreatureGenerator {
  public static readonly creatureChooser = CreatureChooser;
  public static readonly creatureAbilitiesChooser = CreatureAbilitiesChooser;
  public static readonly nameChooser = NameChooser;
  public static readonly optionsChooser = OptionsChooser;
  public static readonly trappingChooser = TrappingChooser;
  public static readonly magicsChooser = MagicsChooser;
  public static readonly mutationsChooser = MutationsChooser;
  public static readonly referential = ReferentialUtil;
  public static readonly compendium = CompendiumUtil;
  public static readonly translateErrorDetect = TranslateErrorDetect;

  public static async generateCreature(
    callback?: (model: CreatureModel, actorData: any, actor: any) => void
  ) {
    await this.compendium.initCompendium(async () => {
      await this.generateCreatureModel(async (model) => {
        const actorData = await CreatureBuilder.buildCreatureData(model);
        const actor = await CreatureBuilder.createCreature(model, actorData);
        ui.notifications.info(
          game.i18n.format('WFRP4NPCGEN.notification.creature.created', {
            name: actor.name,
          })
        );
        await WaiterUtil.hide();
        if (callback != null) {
          callback(model, actorData, actor);
        }
      });
    }, true);
  }

  public static async generateCreatureModel(
    callback: (model: CreatureModel) => void
  ) {
    const creatureModel = new CreatureModel();
    CheckDependencies.check((canRun) => {
      if (canRun) {
        this.selectCreature(creatureModel, callback);
      }
    });
  }

  private static async selectCreature(
    model: CreatureModel,
    callback: (model: CreatureModel) => void
  ) {
    await this.creatureChooser.selectCreature(
      model.creatureTemplate.creatureData?._id,
      async (creature: Actor.Data & any) => {
        model.creatureTemplate = new CreatureTemplate();
        model.abilities = new CreatureAbilities();
        model.trappings = [];
        model.spells = [];
        model.prayers = [];
        model.physicalMutations = [];
        model.mentalMutations = [];
        model.creatureTemplate.creatureData = creature;

        const swarm: Item &
          any = await this.compendium.getCompendiumSwarmTrait();
        const weapon: Item &
          any = await this.compendium.getCompendiumWeaponTrait();
        const armour: Item &
          any = await this.compendium.getCompendiumArmourTrait();
        const ranged: Item &
          any = await this.compendium.getCompendiumRangedTrait();
        const size: Item & any = await this.compendium.getCompendiumSizeTrait();

        model.creatureTemplate.size = creature.data?.details?.size?.value;
        model.creatureTemplate.swarm = duplicate(
          creature.traits
        )?.find((t: any) => EntityUtil.match(t, swarm));
        model.creatureTemplate.isSwarm =
          model.creatureTemplate.swarm != null &&
          model.creatureTemplate.swarm.included;

        model.creatureTemplate.weapon = duplicate(
          creature.traits
        )?.find((t: any) => EntityUtil.match(t, weapon));
        model.creatureTemplate.hasWeaponTrait =
          model.creatureTemplate.weapon != null &&
          model.creatureTemplate.weapon.included;

        model.creatureTemplate.armour = duplicate(
          creature.traits
        )?.find((t: any) => EntityUtil.match(t, armour));
        model.creatureTemplate.hasArmourTrait =
          model.creatureTemplate.armour != null &&
          model.creatureTemplate.armour.included;

        model.creatureTemplate.ranged = duplicate(
          creature.traits
        )?.find((t: any) => EntityUtil.match(t, ranged));

        if (model.creatureTemplate.armour != null) {
          model.creatureTemplate.armourValue = StringUtil.getGroupName(
            model.creatureTemplate.armour.displayName
          );
        }

        if (model.creatureTemplate.weapon != null) {
          model.creatureTemplate.weaponDamage =
            model.creatureTemplate.weapon.data.specification.value;
        }

        if (model.creatureTemplate.ranged != null) {
          model.creatureTemplate.rangedRange = StringUtil.getGroupName(
            model.creatureTemplate.ranged.name
          );
          model.creatureTemplate.rangedDamage =
            model.creatureTemplate.ranged.data.specification.value;
          if (model.creatureTemplate.rangedDamage?.includes('+')) {
            model.creatureTemplate.rangedDamage = model.creatureTemplate.rangedDamage.replace(
              '+',
              ''
            );
          }
        }

        model.abilities.includeBasicSkills = creature.basicSkills?.length > 0;
        model.abilities.sizeKey = creature.data?.details?.size?.value;
        model.abilities.isSwarm = model.creatureTemplate.isSwarm;
        model.abilities.hasWeaponTrait = model.creatureTemplate.hasWeaponTrait;
        model.abilities.hasArmourTrait =
          model.creatureTemplate.armour != null &&
          model.creatureTemplate.armour.included;
        model.abilities.hasRangedTrait =
          model.creatureTemplate.ranged != null &&
          model.creatureTemplate.ranged.included;
        model.abilities.weaponDamage = model.creatureTemplate.weaponDamage;
        model.abilities.rangedRange = model.creatureTemplate.rangedRange;
        model.abilities.rangedDamage = model.creatureTemplate.rangedDamage;
        model.abilities.armourValue = model.creatureTemplate.armourValue;

        const traits = creature.traits.filter((t: any) => {
          return (
            !EntityUtil.match(t, swarm) &&
            !EntityUtil.match(t, weapon) &&
            !EntityUtil.match(t, armour) &&
            !EntityUtil.match(t, ranged) &&
            !EntityUtil.match(t, size)
          );
        });
        const compendiumTraits = await ReferentialUtil.getTraitEntities(true);
        for (let trait of traits) {
          const finalTrait = duplicate(
            compendiumTraits.find(
              (t: Item & any) =>
                t.data.name === trait.displayName ||
                t.data.originalName === trait.displayName
            )?.data ?? trait
          );
          finalTrait.displayName = trait.displayName;
          finalTrait.included = trait.included;
          model.abilities.traits.push(finalTrait);
        }

        const skills = creature.skills.filter((s: any) => {
          return s.data.advances.value > 0;
        });
        const compendiumSkills = await ReferentialUtil.getSkillEntities(true);
        for (let skill of skills) {
          const finalSkill =
            compendiumSkills.find(
              (s: Item & any) =>
                s.data.name === skill.name || s.data.originalName === skill.name
            )?.data ?? skill;
          finalSkill.data.advances.value = skill.data.advances.value;
          model.abilities.skills.push(duplicate(finalSkill));
        }

        const talents = creature.talents;
        const compendiumTalents = await ReferentialUtil.getTalentEntities(true);
        for (let talent of talents) {
          const finalTalent =
            compendiumTalents.find(
              (t: Item & any) =>
                t.data.name === talent.name ||
                t.data.originalName === talent.name
            )?.data ?? talent;
          finalTalent.data.advances.value = talent.data.advances.value;
          model.abilities.talents.push(duplicate(finalTalent));
        }

        for (let inventory of Object.values(creature.inventory)) {
          model.trappings.push(...(<any>inventory).items);
        }

        const spells = await ReferentialUtil.getSpellEntities();
        const prayers = await ReferentialUtil.getPrayerEntities();
        const physicals = await ReferentialUtil.getPhysicalMutationEntities();
        const mentals = await ReferentialUtil.getMentalMutationEntities();

        model.spells = [
          ...creature.petty.map((p: Item.Data) => {
            const spell = spells.find((s) => s.name === p.name);
            return spell != null ? duplicate(spell.data) : p;
          }),
          ...creature.grimoire.map((g: Item.Data) => {
            const spell = spells.find((s) => s.name === g.name);
            return spell != null ? duplicate(spell.data) : g;
          }),
        ];
        model.prayers = [
          ...creature.blessings.map((b: Item.Data) => {
            const prayer = prayers.find((p) => p.name === b.name);
            return prayer != null ? duplicate(prayer.data) : b;
          }),
          ...creature.miracles.map((m: Item.Data) => {
            const prayer = prayers.find((p) => p.name === m.name);
            return prayer != null ? duplicate(prayer.data) : m;
          }),
        ];
        model.physicalMutations = creature.mutations
          .filter(
            (m: Item.Data) => (<any>m.data).mutationType.value === 'physical'
          )
          .map((m: Item.Data) => {
            const mutation = physicals.find((p) => p.name === m.name);
            return mutation != null ? duplicate(mutation.data) : m;
          });
        model.mentalMutations = creature.mutations
          .filter(
            (m: Item.Data) => (<any>m.data).mutationType.value === 'mental'
          )
          .map((m: Item.Data) => {
            const mutation = mentals.find((p) => p.name === m.name);
            return mutation != null ? duplicate(mutation.data) : m;
          });

        await this.selectCreatureAbilities(model, callback);
      }
    );
  }

  private static async selectCreatureAbilities(
    model: CreatureModel,
    callback: (model: CreatureModel) => void
  ) {
    await this.creatureAbilitiesChooser.selectCreatureAbilities(
      model.abilities,
      (abilities) => {
        model.abilities = abilities;
        this.selectName(model, callback);
      },
      () => {
        this.selectCreature(model, callback);
      }
    );
  }

  private static async selectName(
    model: CreatureModel,
    callback: (model: CreatureModel) => void
  ) {
    if (model.name == null) {
      const swarm = await this.compendium.getCompendiumSwarmTrait();
      const swarmLabel = model.abilities.isSwarm ? `, ${swarm.name}` : '';

      model.name = `${model.creatureTemplate.creatureData.name} (${
        this.compendium.getSizes()[model.abilities.sizeKey]
      }${swarmLabel})`;
    }
    await this.nameChooser.selectName(
      model.name,
      model.abilities.speciesKey,
      model.abilities.speciesKey != 'none',
      (name: string) => {
        model.name = name;
        this.selectOptions(model, callback);
      },
      () => {
        this.selectCreatureAbilities(model, callback);
      }
    );
  }

  private static async selectOptions(
    model: CreatureModel,
    callback: (model: CreatureModel) => void
  ) {
    model.options.imagePath = model.creatureTemplate.creatureData.img ?? '';
    model.options.tokenPath =
      model.creatureTemplate.creatureData.token?.img ?? '';

    await this.optionsChooser.selectOptions(
      true,
      model.options,
      'creature',
      (options: Options) => {
        model.options = options;
        this.finalize(model, callback);
      },
      () => {
        this.selectName(model, callback);
      }
    );
  }

  private static async finalize(
    model: CreatureModel,
    callback: (model: CreatureModel) => void
  ) {
    await WaiterUtil.show(
      'WFRP4NPCGEN.creature.generation.inprogress.title',
      'WFRP4NPCGEN.creature.generation.inprogress.hint',
      async () => {
        console.log('Prepare Basic skills');
        await this.addBasicSkill(model);

        console.log('Prepare Basic Chars');
        await this.addBasicChars(model);

        console.log('Prepare Swarm');
        await this.addSwarm(model);

        console.log('Prepare Size');
        await this.addSize(model);

        console.log('Prepare Weapon');
        await this.addWeapon(model);

        console.log('Prepare Ranged');
        await this.addRanged(model);

        console.log('Prepare Armour');
        await this.addArmour(model);

        await this.editTrappings(model, callback);
      }
    );
  }

  private static async editTrappings(
    model: CreatureModel,
    callback: (model: CreatureModel) => void
  ) {
    if (model.options.editTrappings) {
      await WaiterUtil.hide(false);
      await this.trappingChooser.selectTrappings(
        model.trappings,
        async (trappings) => {
          model.trappings = trappings;
          await this.editMagics(model, callback);
        }
      );
    } else {
      await this.editMagics(model, callback);
    }
  }

  private static async editMagics(
    model: CreatureModel,
    callback: (model: CreatureModel) => void
  ) {
    if (model.options.addMagics) {
      const undo = model.options.editTrappings
        ? () => {
            this.editTrappings(model, callback);
          }
        : undefined;
      await WaiterUtil.hide(false);
      await this.magicsChooser.selectMagics(
        model.spells,
        model.prayers,
        async (spells, prayers) => {
          model.spells = spells;
          model.prayers = prayers;
          await this.editMutations(model, callback);
        },
        undo
      );
    } else {
      await this.editMutations(model, callback);
    }
  }

  private static async editMutations(
    model: CreatureModel,
    callback: (model: CreatureModel) => void
  ) {
    if (model.options.addMutations) {
      const undo = model.options.addMagics
        ? () => {
            this.editMagics(model, callback);
          }
        : model.options.editTrappings
        ? () => {
            this.editTrappings(model, callback);
          }
        : undefined;
      await WaiterUtil.hide(false);
      await this.mutationsChooser.selectMutations(
        model.physicalMutations,
        model.mentalMutations,
        async (physicals, mentals) => {
          await WaiterUtil.show(
            'WFRP4NPCGEN.creature.generation.inprogress.title',
            'WFRP4NPCGEN.creature.generation.inprogress.hint',
            async () => {
              model.physicalMutations = physicals;
              model.mentalMutations = mentals;
              callback(model);
            }
          );
        },
        undo
      );
    } else {
      await WaiterUtil.show(
        'WFRP4NPCGEN.creature.generation.inprogress.title',
        'WFRP4NPCGEN.creature.generation.inprogress.hint',
        async () => {
          callback(model);
        }
      );
    }
  }

  private static async addBasicSkill(model: CreatureModel) {
    if (model.abilities.includeBasicSkills) {
      const skills = await this.referential.getAllBasicSkills();
      for (let skill of skills) {
        const existingSkill = model.abilities.skills.find(
          (s) => s.name === skill.name
        );
        if (existingSkill == null) {
          model.abilities.skills.push(skill);
        }
      }
    }
  }

  private static async addBasicChars(model: CreatureModel) {
    Object.entries(
      model.creatureTemplate.creatureData.data.characteristics
    ).forEach(([key, char]) => {
      let initial = (<any>char).value;
      if (initial > 0) {
        const positive = RandomUtil.getRandomBoolean();
        const amplitude = RandomUtil.getRandomPositiveNumber(6);
        const adjust =
          (positive ? 1 : -1) * RandomUtil.getRandomPositiveNumber(amplitude);
        initial = Math.max(1, initial + adjust);
      }

      model.chars[key] = {
        initial: initial,
        advances: 0,
      };
    });
    if (model.creatureTemplate.isSwarm) {
      model.chars.ws.initial -= 10;
    }

    const fromSize = ReferentialUtil.sortedSize.indexOf(
      model.creatureTemplate.size
    );
    const toSize = ReferentialUtil.sortedSize.indexOf(model.abilities.sizeKey);

    const sizeRatio = Math.abs(toSize - fromSize);
    const smallToBig = toSize > fromSize;

    if (sizeRatio > 0) {
      model.chars.s.initial += sizeRatio * 10 * (smallToBig ? 1 : -1);
      model.chars.t.initial += sizeRatio * 10 * (smallToBig ? 1 : -1);
      model.chars.ag.initial += sizeRatio * 5 * (smallToBig ? -1 : 1);
    }

    Object.entries(model.chars).forEach(([_key, char]) => {
      if (char.initial < 0) {
        char.initial = 0;
      }
    });
  }

  private static async addSwarm(model: CreatureModel) {
    const swarm: Item.Data & any = duplicate(
      (await this.compendium.getCompendiumSwarmTrait()).data
    );
    if (model.abilities.isSwarm) {
      model.abilities.traits.push(swarm);
      swarm.included = true;
    } else if (model.creatureTemplate.swarm != null) {
      swarm.included = false;
      model.abilities.traits.push(swarm);
    }
  }

  private static async addSize(model: CreatureModel) {
    const size: Item.Data & any = duplicate(
      (await this.compendium.getCompendiumSizeTrait()).data
    );
    (<any>size.data).specification.value = this.compendium.getSizes()[
      model.abilities.sizeKey
    ];
    size.included = true;
    model.abilities.traits.push(size);
  }

  private static async addWeapon(model: CreatureModel) {
    const weapon: Item.Data & any = duplicate(
      (await this.compendium.getCompendiumWeaponTrait()).data
    );
    if (model.abilities.hasWeaponTrait) {
      (<any>weapon.data).specification.value = Number.isNumeric(
        model.abilities.weaponDamage
      )
        ? Number(model.abilities.weaponDamage)
        : 0;
      weapon.included = true;
      model.abilities.traits.push(weapon);
    } else if (model.creatureTemplate.weapon != null) {
      (<any>weapon.data).specification.value = Number.isNumeric(
        model.abilities.weaponDamage
      )
        ? Number(model.abilities.weaponDamage)
        : Number.isNumeric(model.creatureTemplate.weaponDamage)
        ? Number(model.creatureTemplate.weaponDamage)
        : 0;
      weapon.included = false;
      model.abilities.traits.push(weapon);
    }
  }

  private static async addRanged(model: CreatureModel) {
    const ranged: Item.Data & any = duplicate(
      (await this.compendium.getCompendiumRangedTrait()).data
    );
    const defaultRange = StringUtil.getGroupName(ranged.name);
    const defaultDamage = ranged.data.specification.value;
    if (model.abilities.hasRangedTrait) {
      const range = Number.isNumeric(model.abilities.rangedRange)
        ? model.abilities.rangedRange
        : defaultRange;
      const damage = Number.isNumeric(model.abilities.rangedDamage)
        ? model.abilities.rangedDamage
        : defaultDamage;
      ranged.name = `${StringUtil.getSimpleName(
        ranged.name
      ).trim()} (${range})`;
      ranged.data.specification.value = damage;
      ranged.included = true;
      model.abilities.traits.push(ranged);
    } else if (model.creatureTemplate.ranged != null) {
      const range = Number.isNumeric(model.abilities.rangedRange)
        ? model.abilities.rangedRange
        : Number.isNumeric(model.creatureTemplate.rangedRange)
        ? model.creatureTemplate.rangedRange
        : defaultRange;
      const damage = Number.isNumeric(model.abilities.rangedDamage)
        ? model.abilities.rangedDamage
        : Number.isNumeric(model.creatureTemplate.rangedDamage)
        ? model.creatureTemplate.rangedDamage
        : defaultDamage;
      ranged.name = `${StringUtil.getSimpleName(
        ranged.name
      ).trim()} (${range})`;
      ranged.data.specification.value = damage;
      ranged.included = false;
      model.abilities.traits.push(ranged);
    }
  }

  private static async addArmour(model: CreatureModel) {
    const armour: Item.Data & any = duplicate(
      (await this.compendium.getCompendiumArmourTrait()).data
    );
    if (model.abilities.hasArmourTrait) {
      armour.data.specification.value = Number.isNumeric(
        model.abilities.armourValue
      )
        ? Number(model.abilities.armourValue)
        : 1;
      armour.included = true;
      model.abilities.traits.push(armour);
    } else if (model.creatureTemplate.armour != null) {
      armour.data.specification.value = Number.isNumeric(
        model.abilities.armourValue
      )
        ? Number(model.abilities.armourValue)
        : Number.isNumeric(model.creatureTemplate.armourValue)
        ? Number(model.creatureTemplate.armourValue)
        : 0;
      armour.included = false;
      model.abilities.traits.push(armour);
    }
  }
}
