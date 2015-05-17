
MongoUrl = new Mongo.Collection('mongoUrl');

Meteor.subscribe('mongoUrl');

sigFigs = function(m, n) {
  n = n || 3;
  var leftOfDecimal = Math.ceil(Math.log(m) / Math.log(10));
  return m.toFixed(Math.max(0, n - leftOfDecimal));
}

function formatTime(ms) {
  var S = 1000;
  var M = 60*S;
  var H = 60*M;
  var D = 24*H;

  if (ms < M) {
    if (ms < S) {
      return ms + 'ms';
    }
    return sigFigs(ms/1000) + 's';
  }

  var highestLevel = -1;
  var levels = [[D,'d'],[H,'h'],[M,'m'],[S,'s']/*,[1,'ms']*/];
  var r =
        levels.map(function(level, idx) {
          if (ms > level[0]) {
            if (highestLevel < 0) {
              highestLevel = idx;
            }
            var v = Math.floor(ms / level[0]);
            ms -= v*level[0];
            return v+level[1];
            return v;
          }
        });

  return [r[highestLevel], r[highestLevel+1]].join('');
}

Template.registerHelper("log", function(something) {
  console.log(something);
});

function fullMongoUrl() {
  var url = MongoUrl.findOne();
  return url && url.url || "";
}
function mongoUrl() {
  var url = MongoUrl.findOne();
  return url && url.shortUrl || "";
}
Template.registerHelper("mongoUrl", mongoUrl);

Template.navbar.events({
  'click .navbar-text': function(e) {
    prompt("Copy the mongo URL below", fullMongoUrl());
  }
});

completedStages = function() {
  return Stages.find({
    $or: [
      { ended: true },
      { skipped: true },
      { "time.end": { $exists: true }}
    ]
  }, { sort: { id: -1 }});
}
Template.registerHelper("completedStages", completedStages);
Template.registerHelper("numCompletedStages", function() {
  return completedStages().count();
});

activeStages = function() {
  return Stages.find({
    $or: [
      { started: true },
      { "time.start": { $exists: true } }
    ],
    ended: { $not: true },
    skipped: { $not: true },
    "time.end": { $exists: false }
  }, { sort: { id: -1 }});
}
Template.registerHelper("activeStages", activeStages);
Template.registerHelper("numActiveStages", function() {
  return activeStages().count();
});

pendingStages = function() {
  return Stages.find({
    started: { $not: true },
    "time.start": { $exists: false },
    ended: { $not: true },
    skipped: { $not: true },
    "time.end": { $exists: false }
  }, { sort: { id: -1 }});
}
Template.registerHelper("pendingStages", pendingStages);
Template.registerHelper("numPendingStages", function() {
  return pendingStages().count();
});

skippedStages = function() {
  return Stages.find({
    skipped: true
  });
}
Template.registerHelper("skippedStages", skippedStages);
Template.registerHelper("numSkippedStages", function() {
  return skippedStages().count();
});

Template.registerHelper("formatDateTime", function(dt) {
  return dt && moment(dt).format("YYYY/MM/DD HH:mm:ss") || "-";
});

function formatBytes(bytes) {
  if (!bytes) return "-";
  var base = 1024;
  var cutoff = 2;
  var levels = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  for (var i = 0; i < levels.length; i++) {
    var order = levels[i];
    if (bytes < cutoff*base || order == 'PB') {
      return sigFigs(bytes) + order;
    }
    bytes /= 1024;
  }
}
Template.registerHelper("formatBytes", formatBytes);

Template.registerHelper("jobStatus", function(job) {
  if (!job) { return ""; }
  if (job.succeeded) return "SUCCEEDED";
  if (job.failed) return "FAILED";
  if (job.inProgress) return "RUNNING";
  return "UNKNOWN";
});

Template.registerHelper("formatDuration", function(start, end) {
  return end ? formatTime(end - start) : (formatTime(moment().unix()*1000 - start) + '...');
});

Template.appsPage.helpers({
  applications: function() {
    return Applications.find();
  }
});

Template.jobsPage.helpers({

  rowClass: function(job) {
    if (job.succeeded) {
      return "succeeded";
    } else if (job.inProgress) {
      return "in-progress";
    } else if (job.failed) {
      return "failed";
    } else {
      return "";
    }
  },

  getJobName: function(job) {
    // NOTE(ryan): this sort presumably does not use my {appId:1,jobId:1} index on Stages.
    var stage = Stages.findOne({ jobId: job.id }, { sort: { id: -1 } });
    return stage && stage.name || "";
  },

  getJobDuration: function(job) {
    return job.time.end ?
          formatTime(job.time.end - job.time.start) :
          (formatTime(Math.max(0, moment().unix()*1000 - job.time.start)) + '...')
          ;
  }

});

Template.jobPage.helpers({
  completed: function(stageCounts) {
    return (stageCounts && (stageCounts.num - stageCounts.running)) || 0;
  }
});

Template.stageRow.helpers({
  getClass: function(stage) {
    if (!stage) return "";
    if (stage.failureReason) {
      return "failed"
    }
    if (stage.time && stage.time.end) {
      return "succeeded";
    }
    return "";
  },
  shuffleRead: function(shuffleReadMetrics) {
    return shuffleReadMetrics && formatBytes(shuffleReadMetrics.localBytesRead + shuffleReadMetrics.remoteBytesRead) || "";
  }
})

Template.progressBar.helpers({
  label: function(counts) {
    return counts.succeeded + "/" + counts.num + (counts.running ? (" (" + counts.running + " running)") : "");
  },
  completedPercentage: function(bar) {
    var p = (bar.succeeded / bar.num) * 100 + '%'
    return p;
  },
  runningPercentage: function(bar) {
    var p = (bar.running / bar.num) * 100 + '%';
    return p;
  }
});
