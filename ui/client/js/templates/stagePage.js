
var statuses = {
  undefined: "PENDING",
  1: "RUNNING",
  2: "SUCCESS",
  3: "FAILED",
  4: "SKIPPED"
};

var columns = [
  { id: 'index', label: 'Index', cmpFn: sortBy('index') },
  { id: 'id', label: 'ID', cmpFn: sortBy('id') },
  { id: 'attempt', label: 'Attempt', cmpFn: sortBy('attempt') },
  { id: 'status', label: 'Status', cmpFn: sortBy('status') },
  { id: 'localityLevel', label: 'Locality Level', cmpFn: sortBy('locality') },
  { id: 'execId', label: 'Executor', cmpFn: sortBy('execId') },
  { id: 'host', label: 'Host'/*, cmpFn: sortBy('')*/ },
  { id: 'start', label: 'Launch Time', cmpFn: sortBy('time.start') },
  { id: 'duration', label: 'Duration', cmpFn: durationCmp() },
  { id: 'gcTime', label: 'GC Time', cmpFn: sortBy('metrics.JVMGCTime') },
  { id: 'input', label: 'Input', cmpFn: sortBy('metrics.InputMetrics.BytesRead') },
  { id: 'inputRecords', label: 'Records', cmpFn: sortBy('metrics.InputMetrics.RecordsRead') },
  { id: 'output', label: 'Output', cmpFn: sortBy('metrics.OutputMetrics.BytesWritten') },
  { id: 'outputRecords', label: 'Records', cmpFn: sortBy('metrics.OutputMetrics.RecordsWritten') },
  { id: 'shuffleRead', label: 'Shuffle Read', cmpFn: shuffleBytesReadCmp() },
  { id: 'shuffleReadRecords', label: 'Records', cmpFn: sortBy('metrics.ShuffleReadMetrics.TotalRecordsRead') },
  { id: 'shuffleWrite', label: 'Shuffle Write', cmpFn: sortBy('metrics.ShuffleWriteMetrics.ShuffleBytesWritten') },
  { id: 'shuffleWriteRecords', label: 'Records', cmpFn: sortBy('metrics.ShuffleWriteMetrics.ShuffleRecordsWritten') },
  { id: 'errors', label: 'Errors', cmpFn: sortBy('errors') }
];

var columnsById = {};
columns.forEach(function(column) {
  columnsById[column.id] = column;
  column.template = 'taskRow-' + column.id;
  column.table = 'task-table';
});


var hases = {
  hasInput: function() {
    var stage = Stages.findOne();
    return stage && stage.metrics && stage.metrics.InputMetrics && stage.metrics.InputMetrics.BytesRead;
  },

  hasOutput: function() {
    var stage = Stages.findOne();
    return stage && stage.metrics && stage.metrics.OutputMetrics && stage.metrics.OutputMetrics.BytesWritten;
  },

  hasShuffleRead: function() {
    var stage = Stages.findOne();
    return stage && stage.metrics && shuffleBytesRead(stage.metrics.ShuffleReadMetrics);
  },

  hasShuffleWrite: function() {
    var stage = Stages.findOne();
    var ret = stage && stage.metrics && stage.metrics.ShuffleWriteMetrics && stage.metrics.ShuffleWriteMetrics.ShuffleBytesWritten;
    return !!ret;
  }

};

Template.stagePage.helpers({
  setTitle: function(data) {
    document.title = "Stage " + (data.stage && (data.stage.id !== undefined) ? data.stage.id : "-") + " (" + (data.stageAttempt && (data.stageAttempt.id !== undefined) ? data.stageAttempt.id : "-") + ")";
    return null;
  },

  localityLevel: function(taskLocality) {
    return LocalityLevels[taskLocality];
  }
});

Template.stagePage.helpers(hases);
Template.metricsHeaders.helpers(hases);
Template.metricsColumns.helpers(hases);

Template.exceptionFailure.helpers({
  exceptionFailure: function(reason) {
    return reason == "ExceptionFailure"
  }
});
Template.fetchFailure.helpers({
  fetchFailure: function(reason) {
    return reason == "FetchFailure"
  }
});
Template.executorLostFailure.helpers({
  executorLostFailure: function(reason) {
    return reason == "ExecutorLostFailure"
  },
  getHostPort: function(execId) {
    var e = Executors.findOne({ id: execId });
    if (e) {
      return e.host + ':' + e.port;
    }
    return null;
  }
});

Template.summaryMetricsTable.helpers({
  numCompletedTasks: function(taskCounts) {
    return taskCounts && ((taskCounts.succeeded || 0) + (taskCounts.failed || 0));
  }
});

Template.executorRow.helpers({
  taskTime: function() {
    var stage = Stages.findOne();
    var stageId = stage && stage.id;
    var attempt = StageAttempts.findOne();
    var attemptId = attempt && attempt.id;
    var key = ['stages', stageId, attemptId, 'metrics', 'ExecutorRunTime'].join('.');
    var fields = {};
    fields[key] = 1;
    var e = Executors.findOne({ id: this.id }, { fields: fields });
    return acc(key)(e) || {};
  },
  taskCounts: function(execId) {
    var stage = Stages.findOne();
    var stageId = stage && stage.id;
    var attempt = StageAttempts.findOne();
    var attemptId = attempt && attempt.id;
    var key = ['stages', stageId, attemptId, 'taskCounts'].join('.');
    var fields = {};
    fields[key] = 1;
    var e = Executors.findOne({ id: execId }, { fields: fields });
    return acc(key)(e) || {};
  }
});

Template.tasksTable.helpers({
  sorted: function(taskAttempts) {
    var sort = Session.get('task-table-sort') || ['index', 1];
    var cmpFn = columnsById[sort[0]].cmpFn;
    var arr = taskAttempts.map(identity);
    if (cmpFn) {
      return sort[1] == 1 ? arr.sort(cmpFn) : arr.sort(cmpFn).reverse();
    } else {
      return sort[1] == 1 ? arr.sort() : arr.sort().reverse();
    }
  },

  columns: function() { return columns; }

});

Template['taskRow-host'].helpers({

  getHost: function(appId, execId) {
    // TODO(ryan): possibly inefficient on the critical path.
    var e = Executors.findOne({ appId: appId, id: execId });
    return e && e.host;
  }

});

Template['taskRow-status'].helpers({

  status: function(task) {
    return statuses[task.status];
  }

});
