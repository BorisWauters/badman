import { NgxMatMomentAdapter } from '@angular-material-components/moment-adapter';
import { Component, OnInit } from '@angular/core';
import { DateAdapter } from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';
import { language_map, setLanguage } from '../../../../factory';

@Component({
  selector: 'badman-language',
  templateUrl: './language.component.html',
  styleUrls: ['./language.component.scss'],
})
export class LanguageComponent implements OnInit {
  current!: string;
  langs!: string[];

  constructor(
    public translate: TranslateService,
    private _adapter: DateAdapter<NgxMatMomentAdapter>
  ) {}

  ngOnInit(): void {
    this.langs = [...language_map.keys()];
    this.current = this.translate.currentLang;
  }

  async setLang(lang: string) {
    // Get value from map
    const values = language_map.get(lang);
    if (!values) {
      return;
    }

    await setLanguage(
      values.translate,
      values.moment,
      this._adapter,
      this.translate
    );

    // Store
    this.current = lang;
    localStorage.setItem('translation.language', lang);
  }
}
