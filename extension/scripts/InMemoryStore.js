
var InMemoryStore = function (realtimeCallback) {
  if(realtimeCallback) this.realtimeCallback = realtimeCallback
  this.data = []
}

InMemoryStore.prototype = {

  writeDocs: function (data, callback) {
    data.forEach(function (data) {  
      if (this.realtimeCallback) this.realtimeCallback(data)
      this.data.push(data)
    }.bind(this))
    callback()
  },

  initSitemapDataDb: function (sitemapId, callback) {
    callback(this)
  }
}

module.exports = InMemoryStore
