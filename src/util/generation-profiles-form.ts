import GenerationProfiles from './generation-profiles.js';
import RegisterSettings from './register-settings.js';
import ReferentialUtil from './referential-util.js';
import NameChooser from './name-chooser.js';

export default class GenerationProfilesForm extends FormApplication<GenerationProfiles> {
  private data: any;

  constructor(
    object: GenerationProfiles,
    options: FormApplication.Options = {}
  ) {
    super(object, options);
  }

  public static get defaultOptions(): FormApplication.Options {
    return mergeObject(super.defaultOptions, {
      id: 'generation-profiles',
      title: game.i18n.localize('WFRP4NPCGEN.settings.generationProfiles.name'),
      template: `modules/${RegisterSettings.moduleName}/templates/generation-profiles.html`,
      width: 700,
      height: 'auto',
      resizable: true,
      closeOnSubmit: false,
    });
  }

  public getData(): any {
    if (this.data == null) {
      const profiles: { [key: string]: any } = duplicate(
        game.settings.get(RegisterSettings.moduleName, 'generationProfiles')
      );
      const speciesMap = ReferentialUtil.getSpeciesMap();
      Object.entries(speciesMap).forEach(([key, label]) => {
        if (profiles[key] != null) {
          profiles[key].species = label;
        }
      });
      Object.entries(profiles).forEach(([key, value]) => {
        value.profiles.forEach((profile: any) => {
          profile.id = `${key}-${name}`;
        });
      });
      this.data = profiles;
    }

    return {
      species: this.data,
    };
  }

  public activateListeners(html: JQuery) {
    html.find('.generation-profiles-add-button').on('click', (event) => {
      const species = (<HTMLButtonElement>event?.currentTarget)?.value;
      NameChooser.selectName('', species, false, (name) => {
        const existingName = this.data[species].profiles.find(
          (p: any) => p.id === `${species}-${name}`
        );

        if (existingName == null) {
          this.data[species].profiles.push({
            id: `${species}-${name}`,
            name: name,
            genPath: '',
            imagePath: '',
            tokenPath: '',
          });
          this.render();
        }
      });
    });

    html.find('.generation-profiles-edit-button').on('click', (event) => {
      const id = (<HTMLButtonElement>event?.currentTarget)?.value;
      if (id != null && id.includes('-')) {
        const species = id.substring(0, id.indexOf('-'));
        const name = id.substring(id.indexOf('-') + 1, id.length);
        NameChooser.selectName(name, species, false, (name) => {
          const existingName = this.data[species].profiles.find(
            (p: any) => p.id === `${species}-${name}`
          );

          if (existingName != null) {
            existingName.name = name;
            existingName.id = `${species}-${name}`;
            this.render();
          }
        });
      }
    });

    html.find('.generation-profiles-delete-button').on('click', (event) => {
      const id = (<HTMLButtonElement>event?.currentTarget)?.value;
      if (id != null && id.includes('-')) {
        const species = id.substring(0, id.indexOf('-'));
        if (this.data[species] != null) {
          const indexToRemove = this.data[species].profiles.findIndex(
            (p: any) => p.id === id
          );
          if (indexToRemove >= 0) {
            this.data[species].profiles.splice(indexToRemove, 1);
            this.render();
          }
        }
      }
    });
    super.activateListeners(html);
  }

  protected _onChangeInput(event: Event | JQuery.Event) {
    console.dir(event);
    super._onChangeInput(event);
  }

  protected _getSubmitData(_updateData?: object): any {
    return this.data;
  }

  public async _updateObject(_event: Event, formData: any) {
    console.dir(formData);
  }

  public close(options?: object): Promise<void> {
    this.data = null;
    return super.close(options);
  }
}
