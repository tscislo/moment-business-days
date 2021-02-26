/* eslint-env mocha */

'use strict';
var moment = require('../index');
var expect = require('chai').expect;
var holidayFormat = 'YYYY-MM-DD';

var resetLocale = function (done) {
  moment.updateLocale('us', {
    holidays: [
      '2016-07-04'
    ],
    holidayFormat: holidayFormat,
    workingWeekdays: [1, 2, 3, 4, 5],
  });
  done();
};

describe('Moment Business Days', function () {
  afterEach(resetLocale);

  describe('.prevBusinessDay', function () {
    describe('When today is Monday', function () {
      it('should be Friday', function (done) {
        var monday = moment()
          .startOf('week')
          .add(1, 'days');
        var friday = monday.prevBusinessDay();
        expect(friday.format('dddd')).to.eql('Friday');
        done();
      });
    });

    describe('On April 10th, 2019', function () {
      beforeEach(function (done) {
        moment.updateLocale('us', {
          holidays: ['2019-04-05', '2019-04-06', '2019-04-07', '2019-04-08', '2019-04-09'],
          holidayFormat: holidayFormat,
          workingWeekdays: [1],
          prevBusinessDayLimit: 31,
        });
        done();
      });

      afterEach(resetLocale);

      it('should be 1st when considering holidays and custom working days', function (done) {
        var first = moment('2019-04-10').prevBusinessDay();
        expect(first.format('D')).to.eql('1');
        done();
      });
    });
  });

  describe('.isBusinessDay', function () {
    describe('When today is a regular weekday', function () {
      it('should be true', function (done) {
        var wednesday = moment()
          .startOf('week')
          .add(3, 'days');
        expect(wednesday.isBusinessDay()).to.be.true;
        done();
      });
    });

    describe('When today is a weekend', function () {
      it('should be false', function (done) {
        var sunday = moment().startOf('week');
        expect(sunday.isBusinessDay()).to.be.false;
        done();
      });
    });

    describe('When today is a holiday determined by a function', function () {
      var callCount = 0;

      beforeEach(function (done) {
        moment.locale('xmas', {
          // Every Christmas is a holiday, no matter the year
          holiday: function (someMoment) {
            callCount++;

            // Months indexed starting at 0, so December is 11.
            return someMoment.month() === 11 && someMoment.date() === 25;
          }
        });
        done();
      });

      afterEach(resetLocale);

      it('should be false', function (done) {
        // In these years, Christmas was a weekday
        expect(moment('2012-12-25').isBusinessDay()).to.be.false;
        expect(moment('2013-12-25').isBusinessDay()).to.be.false;
        expect(moment('2014-12-25').isBusinessDay()).to.be.false;
        expect(moment('2015-12-25').isBusinessDay()).to.be.false;
        expect(callCount).to.equal(4);
        done();
      });
    });

    describe('When today is custom working day', function () {
      beforeEach(function (done) {
        moment.updateLocale('us', {
          workingWeekdays: [1, 2, 3, 4, 5, 6]
        });
        done();
      });
      it('should be true', function (done) {
        var saturday = moment().endOf('week');
        expect(saturday.isBusinessDay()).to.be.true;
        done();
      });
    });

    describe('When today is a holiday', function () {
      var july4th = '2015-07-04';

      beforeEach(function (done) {
        moment.updateLocale('us', {
          holidays: [july4th],
          holidayFormat: holidayFormat
        });
        done();
      });

      afterEach(resetLocale);

      it('should be false', function (done) {
        expect(moment(july4th, holidayFormat).isBusinessDay()).to.be.false;
        done();
      });
    });
  });

  describe('.businessDaysIntoMonth', function () {
    afterEach(resetLocale);

    describe('When moment object is invalid', function () {
      it('should return NaN', function () {
        var businessDaysIntoMonth = moment(null).businessDaysIntoMonth();
        expect(businessDaysIntoMonth).to.be.NaN;
      });
    });

    describe('On Wednesday, September 23rd 2015', function () {
      it('should be 17 when there are no holidays', function (done) {
        moment.updateLocale('us', {
          workingWeekdays: null
        });
        var businessDaysIntoMonth = moment('2015-09-23').businessDaysIntoMonth();
        expect(businessDaysIntoMonth).to.eql(17);
        done();
      });
      it('should be 16 when considering labor day', function (done) {
        moment.updateLocale('us', {
          holidays: ['2015-09-07'],
          holidayFormat: holidayFormat
        });
        var businessDaysIntoMonth = moment('2015-09-23').businessDaysIntoMonth();
        expect(businessDaysIntoMonth).to.eql(16);
        done();
      });
    });
  });

  describe('.businessAdd', function () {
    afterEach(resetLocale);

    describe('When moment object is invalid', function () {
      it('should return a new invalid moment object', function () {
        var originalMoment = moment(null);
        var newBusinessDay = originalMoment.businessAdd(3);
        // Deepy equal but not strictly equal
        expect(originalMoment).to.eql(newBusinessDay);
        expect(originalMoment).not.equal(newBusinessDay);
        // New moment object should also be invalid
        expect(newBusinessDay.isValid()).to.be.false;
      });
    });

    describe('On Thursday, January 3rd 2019', function () {
      it('adds one business day, then converts to string with toISOString()', function (done) {
        var newBusinessDay = moment('2019-01-03T12:00:00.000Z').businessAdd(1, 'days');
        expect(newBusinessDay.toISOString()).to.eql('2019-01-04T12:00:00.000Z');
        done();
      });
    });

    describe('On Tuesday, November 3rd 2015', function () {
      it('adds business days only, excluding weekends, even over 2 weeks', function (done) {
        var newBusinessDay = moment('2015-11-03').businessAdd(5);
        expect(newBusinessDay.format('D')).to.eql('10');
        done();
      });
      it('adds business days only, excluding weekends', function (done) {
        var newBusinessDay = moment('2015-11-03', 'YYYY-MM-DD').businessAdd(10);
        expect(newBusinessDay.format('D')).to.eql('17');
        done();
      });
      it('adds business days only, excluding weekends, preserving time-of-day', function (done) {
        var newBusinessDay = moment('2015-11-03 12:42:00', 'YYYY-MM-DD hh-mm-ss').businessAdd(10);
        expect(newBusinessDay.format('YYYY-MM-DD hh:mm:ss')).to.eql('2015-11-17 12:42:00');
        done();
      });
      it('adds business days only, excluding weekends, rounding down fractional day values', function (done) {
        var newBusinessDay = moment('2015-11-03 12:42:00', 'YYYY-MM-DD hh-mm-ss').businessAdd(10.4);
        expect(newBusinessDay.format('D')).to.eql('17');
        done();
      });
      it('adds business days only, excluding weekends, rounding up fractional day values', function (done) {
        var newBusinessDay = moment('2015-11-03 12:42:00', 'YYYY-MM-DD hh-mm-ss').businessAdd(10.5);
        expect(newBusinessDay.format('D')).to.eql('18');
        done();
      });
      it('subtracts business days when negative values are added, excluding weekends, rounding down fractional day values', function (done) {
        var newBusinessDay = moment('2015-11-03 12:42:00', 'YYYY-MM-DD hh-mm-ss').businessAdd(-10.4);
        expect(newBusinessDay.format('D')).to.eql('20');
        done();
      });
      it('subtracts business days when negative values are added, excluding weekends, rounding up fractional day values', function (done) {
        var newBusinessDay = moment('2015-11-03 12:42:00', 'YYYY-MM-DD hh-mm-ss').businessAdd(-10.5);
        expect(newBusinessDay.format('D')).to.eql('19');
        done();
      });
      it('adds business hours only, excluding weekends', function (done) {
        var newBusinessDay = moment('2015-11-06').businessAdd(
          36,
          'hours'
        );
        expect(newBusinessDay.format('D')).to.eql('9');
        done();
      });
      it('adds business days only, excluding weekends and holidays, if present', function (done) {
        moment.updateLocale('us', {
          holidays: ['2015-11-05'],
          holidayFormat: holidayFormat
        });
        var newBusinessDay = moment('2015-11-03').businessAdd(5);
        expect(newBusinessDay.format('D')).to.eql('11');
        done();
      });
      it('adds business days only, excluding weekends and holidays, if present, even over 2 weeks', function (done) {
        moment.updateLocale('us', {
          holidays: ['2015-11-05', '2015-11-12'],
          holidayFormat: holidayFormat
        });
        var newBusinessDay = moment('2015-11-03').businessAdd(10);
        expect(newBusinessDay.format('D')).to.eql('19');
        done();
      });
    });
  });

  describe('.businessDiff', function () {
    afterEach(resetLocale);
    it('should calculate number of business days between dates', function () {
      var diff = moment('2017-05-15').businessDiff(
        moment('2017-05-08')
      );
      expect(diff).to.eql(5);
    });
    it('...and in reverse order', function () {
      var diff = moment('2017-05-08').businessDiff(
        moment('2017-05-15')
      );
      expect(diff).to.eql(5);
    });
    it('should be negative if start is after end and relative is true', function () {
      var diff = moment('2017-05-08').businessDiff(
        moment('2017-05-15'),
        true
      );
      expect(diff).to.eql(-5);
    });
    it('should be positive if start is after end and relative is false', function () {
      var diff = moment('2017-05-08').businessDiff(
        moment('2017-05-15')
      );
      expect(diff).to.eql(5);
    });
    it('should calculate number of business days with custom workingdays', function () {
      moment.updateLocale('us', {
        workingWeekdays: [1, 2, 3, 4, 5, 6]
      });
      var diff = moment('2017-05-15').businessDiff(
        moment('2017-05-08')
      );
      expect(diff).to.eql(6);
    });
    it('should calculate number of business with all working days', function () {
      moment.updateLocale('us', {
        workingWeekdays: [0, 1, 2, 3, 4, 5, 6]
      });
      var diff = moment('2017-06-18').businessDiff(
        moment('2017-05-18')
      );
      expect(diff).to.eql(31);
    });
    it('should be zero days if start and end is same', function () {
      var diff = moment('2017-05-08').businessDiff(
        moment('2017-05-08')
      );
      expect(diff).to.eql(0);
    });
    it('should be zero days if start and end is same disregarding hours', function () {
      var diff = moment('2018-08-16T19:06:57.665Z').businessDiff(
        moment('2018-08-16T18:06:57.665Z')
      );
      expect(diff).to.eql(0);
    });
    it('should account for holidays', function () {
      var start = moment('2016-07-01');
      var end = moment('2016-07-10');
      var diff = start.businessDiff(end);
      expect(diff).to.eql(4);
    });
    it('should not add an extra day when parameter is not a business day', function () {
      var diff = moment('2021-02-22').businessDiff(
        moment('2021-02-28')
      );
      expect(diff).to.eql(4);
    });
    it('should not add an extra day when original moment object is a non business day and is later than the parameter', function () {
      var diff = moment('2021-02-28').businessDiff(
        moment('2021-02-22'),
        true
      );
      expect(diff).to.eql(4);
    });
    it('should disregard time (hour) in calculating business days', function () {
      var diff = moment('2018-09-04T14:48:46.000Z').businessDiff(
        moment('2018-08-30T11:48:46.000Z')
      );
      expect(diff).to.eql(3);
    });
  });

  describe('.monthBusinessWeeks', function () {
    afterEach(resetLocale);
    it('should return array of business weeks on .monthBusinessWeeks', function () {
      var monthBusinessWeeks = moment('2019-02-02').monthBusinessWeeks();
      expect(monthBusinessWeeks).to.be.an('array').with.length(5);
    });
  });

  describe('.businessWeeksBetween', function () {
    afterEach(resetLocale);
    it('should return array of business weeks on .businessWeeksBetween', function () {
      var businessWeeksBetween = moment('2019-02-02').businessWeeksBetween(moment('2019-04-02'));
      expect(businessWeeksBetween).to.be.an('array').with.length(9);
    });
  });

  describe('Aggregate functions return empty array on invalid object', function () {
    afterEach(resetLocale);
    it('should return empty array on .monthBusinessDays', function () {
      var monthBusinessDays = moment(null).monthBusinessDays();
      expect(monthBusinessDays).to.be.an('array').that.is.empty;
    });
    it('should return empty array on .monthNaturalDays', function () {
      var monthNaturalDays = moment(null).monthNaturalDays();
      expect(monthNaturalDays).to.be.an('array').that.is.empty;
    });
    it('should return empty array on .monthBusinessWeeks', function () {
      var monthBusinessWeeks = moment(null).monthBusinessWeeks();
      expect(monthBusinessWeeks).to.be.an('array').that.is.empty;
    });
    it('should return empty array on .monthNaturalWeeks', function () {
      var monthNaturalWeeks = moment(null).monthNaturalWeeks();
      expect(monthNaturalWeeks).to.be.an('array').that.is.empty;
    });
    it('should return empty array on .businessWeeksBetween', function () {
      var businessWeeksBetween = moment(null).businessWeeksBetween();
      expect(businessWeeksBetween).to.be.an('array').that.is.empty;
    });
  });
});
