import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import moment from 'moment';

@Component({
  selector: 'badman-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent implements OnInit {
  @Input()
  rankingPlaces!: {
    level: number;
    rankingDate: Date;
    points: number;
    pointsDowngrade: number;
    updatePossible: boolean;
  }[];

  @Input()
  maxLevels?: number;

  @Input()
  probablyInacurate: moment.Moment = moment('2018-07-31T22:00:00.000Z');

  seriesData: {
    name: { top: string; bottom: string };
    subName?: string;
    value: [Date, number];
  }[] = [];
  seriesDataInacc: {
    name: { top: string; bottom: string };
    subName?: string;
    value: [Date, number];
  }[] = [];
  axisData = [];
  firstDay!: Date;
  lastDay!: Date;

  interval() {
    return false;
  }

  ngOnInit() {
    this.rankingPlaces = this.rankingPlaces.sort(
      (a, b) =>
        new Date(b.rankingDate).getTime() - new Date(a.rankingDate).getTime()
    );
    this.calcaulteforecast();
    this.createSeries();

    // Get the years for start / end to space them in year basis
    if (this.rankingPlaces && this.rankingPlaces.length > 0) {
      const lastDay = moment(this.rankingPlaces[0].rankingDate)
        .startOf('year')
        .add(1, 'year');
      const firstDay = moment(
        this.rankingPlaces[this.rankingPlaces?.length - 1].rankingDate
      ).startOf('year');
      this.firstDay = firstDay.toDate();
      this.lastDay = lastDay.toDate();
    }
  }

  createSeries() {
    this.rankingPlaces
      .filter((places) => places.updatePossible)
      .forEach((x) => {
        const rankingDate = moment(x.rankingDate);

        const topText = `Level ${x.level} on ${rankingDate.format('DD-MM-Y')}`;
        let bottomText = ``;
        if (x.points) {
          bottomText += `${x.points} upgrade`;
        }
        if (x.points && x.pointsDowngrade) {
          bottomText += `, `;
        } else {
          bottomText += ` points`;
        }
        if (x.pointsDowngrade) {
          bottomText += `${x.pointsDowngrade} downgrade points`;
        }

        if (rankingDate.isBefore(this.probablyInacurate)) {
          this.seriesDataInacc.push({
            name: {
              top: topText,
              bottom: bottomText,
            },
            subName: bottomText,
            value: [rankingDate.toDate(), x.level],
          });
        } else {
          this.seriesData.push({
            name: {
              top: topText,
              bottom: bottomText,
            },
            value: [rankingDate.toDate(), x.level],
          });
        }
      });

    // adding the last value from series data to inacc to complete the line
    // the last value because that's how the sorting was configured
    this.seriesDataInacc.unshift(this.seriesData[this.seriesData.length - 1]);
  }

  calcaulteforecast() {
    // let values = this.rankingPlaces.map((item, i) => [i, item.level]) as DataPoint[];
    // let result = logarithmic(values);
  }
}
