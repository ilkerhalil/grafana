///<reference path="../../../headers/common.d.ts" />

import kbn from 'app/core/utils/kbn';
import _ from 'lodash';
import moment from 'moment';
import TimeSeries from 'app/core/time_series2';
import {colors} from 'app/core/core';

export class DataProcessor {

  constructor(private panel) {
  }

  getSeriesList(options) {
    if (!options.dataList || options.dataList.length === 0) {
      return [];
    }

    // auto detect xaxis mode
    var firstItem;
    if (options.dataList && options.dataList.length > 0) {
      firstItem = options.dataList[0];
      let autoDetectMode = this.getAutoDetectXAxisMode(firstItem);
      if (this.panel.xaxis.mode !== autoDetectMode) {
        this.panel.xaxis.mode = autoDetectMode;
        this.setPanelDefaultsForNewXAxisMode();
      }
    }

    switch (this.panel.xaxis.mode) {
      case 'series':
      case 'time': {
        return options.dataList.map((item, index) => {
          return this.timeSeriesHandler(item, index, options);
        });
      }
      case 'field': {
        return this.customHandler(firstItem);
      }
    }
  }

  getAutoDetectXAxisMode(firstItem) {
    switch (firstItem.type) {
      case 'docs': return 'field';
      case 'table': return 'field';
      default: {
        if (this.panel.xaxis.mode === 'series') {
          return 'series';
        }
        return 'time';
      }
    }
  }

  setPanelDefaultsForNewXAxisMode() {
    switch (this.panel.xaxis.mode) {
      case 'time': {
        this.panel.bars = false;
        this.panel.lines = true;
        this.panel.points = false;
        this.panel.legend.show = true;
        this.panel.tooltip.shared = true;
        this.panel.xaxis.values = [];
        break;
      }
      case 'series': {
        this.panel.bars = true;
        this.panel.lines = false;
        this.panel.points = false;
        this.panel.stack = false;
        this.panel.legend.show = false;
        this.panel.tooltip.shared = false;
        this.panel.xaxis.values = ['total'];
        break;
      }
    }
  }

  timeSeriesHandler(seriesData, index, options) {
    var datapoints = seriesData.datapoints;
    var alias = seriesData.target;

    var colorIndex = index % colors.length;
    var color = this.panel.aliasColors[alias] || colors[colorIndex];

    var series = new TimeSeries({datapoints: datapoints, alias: alias, color: color, unit: seriesData.unit});

    if (datapoints && datapoints.length > 0) {
      var last = datapoints[datapoints.length - 1][1];
      var from = options.range.from;
      if (last - from < -10000) {
        series.isOutsideRange = true;
      }
    }

    return series;
  }

  customHandler(dataItem) {
    let nameField = this.panel.xaxis.name;
    if (!nameField) {
      throw {message: 'No field name specified to use for x-axis, check your axes settings'};
    }
    return [];
  }

  validateXAxisSeriesValue() {
    switch (this.panel.xaxis.mode) {
      case 'series': {
        if (this.panel.xaxis.values.length === 0) {
          this.panel.xaxis.values = ['total'];
          return;
        }

        var validOptions = this.getXAxisValueOptions({});
        var found = _.find(validOptions, {value: this.panel.xaxis.values[0]});
        if (!found) {
          this.panel.xaxis.values = ['total'];
        }
        return;
      }
    }
  }

  getDataFieldNames(dataList, onlyNumbers) {
    if (dataList.length === 0) {
      return [];
    }

    let fields = [];
    var firstItem = dataList[0];
    if (firstItem.type === 'docs'){
      if (firstItem.datapoints.length === 0) {
        return [];
      }

      let fieldParts = [];

      function getPropertiesRecursive(obj) {
        _.forEach(obj, (value, key) => {
          if (_.isObject(value)) {
            fieldParts.push(key);
            getPropertiesRecursive(value);
          } else {
            if (!onlyNumbers || _.isNumber(value)) {
              let field = fieldParts.concat(key).join('.');
              fields.push(field);
            }
          }
        });
        fieldParts.pop();
      }

      getPropertiesRecursive(firstItem.datapoints[0]);
      return fields;
    }
  }

  getXAxisValueOptions(options) {
    switch (this.panel.xaxis.mode) {
      case 'time': {
        return [];
      }
      case 'series': {
        return [
          {text: 'Avg', value: 'avg'},
          {text: 'Min', value: 'min'},
          {text: 'Max', value: 'min'},
          {text: 'Total', value: 'total'},
          {text: 'Count', value: 'count'},
        ];
      }
    }
  }

  pluckDeep(obj: any, property: string) {
    let propertyParts = property.split('.');
    let value = obj;
    for (let i = 0; i < propertyParts.length; ++i) {
      if (value[propertyParts[i]]) {
        value = value[propertyParts[i]];
      } else {
        return undefined;
      }
    }
    return value;
  }

}

