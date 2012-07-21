// Clock!
//
//
(function(){

    var clock = {};
    
    clock.alarms = [];
    
    clock.getTimeString = function() {
      var currentTime = new Date ();
     
      var currentHours = currentTime.getHours ( );
      var currentMinutes = currentTime.getMinutes ( );
      var currentSeconds = currentTime.getSeconds ( );
     
      currentMinutes = ( currentMinutes < 10 ? "0" : "" ) + currentMinutes;
      currentSeconds = ( currentSeconds < 10 ? "0" : "" ) + currentSeconds;
     
      var timeOfDay = ( currentHours < 12 ) ? "am" : "pm";
     
      currentHours = ( currentHours > 12 ) ? currentHours - 12 : currentHours;
      currentHours = ( currentHours == 0 ) ? 12 : currentHours;
    
      var currentTimeString = currentHours + ":" + currentMinutes + ":" + currentSeconds + " " + timeOfDay;
      
      return currentTimeString;
    }
    
    clock.getTimeWordString = function(to, from, metric) {
        
        var distance_in_seconds = ((to - from) / 1000);
        var distance_in_minutes = Math.floor(distance_in_seconds / 60);
      
        if (distance_in_minutes == 0) {
            
            if(distance_in_seconds < 10) return 'just now';
            
            return Math.floor(distance_in_seconds) + ' seconds';
        }
        if (distance_in_minutes == 1) { return 'a minute'; }
        if (distance_in_minutes < 0) { return clock.getTimeWordString(from, to, metric); }
        if (distance_in_minutes < 55) { return distance_in_minutes + ' minutes'; }
        if (distance_in_minutes < 75) { return '1 hour'; }
        if (distance_in_minutes < 1440 || metric == 'hours') { return Math.floor(distance_in_minutes / 60) + ' hours'; }
        if (distance_in_minutes < 2880) { return '1 day'; }
        if (distance_in_minutes < 43200 || metric == 'days') { return Math.floor(distance_in_minutes / 1440) + ' days'; }
        if (distance_in_minutes < 86400) { return '1 month'; }
        if (distance_in_minutes < 525960) { return Math.floor(distance_in_minutes / 43200) + ' months'; }
        if (distance_in_minutes < 1051199) { return '1 year'; }
      
        return 'over ' + Math.floor(distance_in_minutes / 525960) + ' years';
    }
    
    clock.removeAlarm = function(alarm, cb) {
      for(var i in this.alarms) {
        if(this.alarms[i][0] == alarm) {
          delete(this.alarms[i]);
        }
      }
    }
    clock.setAlarm = function(alarm, cb, countdownCallback) {
      this.alarms.push([alarm, cb, countdownCallback])
    }
    clock.checkAlarms = function() {
      var now = new Date();
      
      for(var i in this.alarms) {
        var alarmDate = this.alarms[i][0];
        
        if(alarmDate < now) {
          
          var cb = this.alarms[i][1];
          delete(this.alarms[i]) // remove alarm
          cb();  // fire alarm
        }
        
        if(typeof(this.alarms[i][2] == 'function')) {
            this.alarms[i][2](this.getTimeWordString(now, alarmDate, 'days'), i);
        }
      }
    }
    clock.windClocks = function(el) {
        if(typeof el == 'string') { el = $(el); }
        this.$clocks = el;
    }
    clock.updateClocks = function() {
      var self = this
      if(this.$clocks) {
          this.$clocks.each(function(i,e){
            $(e).html(self.getTimeString());
          })
      }
      this.checkAlarms();
    }
    clock.startClocks = function(el) {
        if(el) this.windClocks(el);
      setInterval(function(){clock.updateClocks();}, 1000 );
    }

    if(define) {
        define(function () {
            return clock;
        });
    }
})();
