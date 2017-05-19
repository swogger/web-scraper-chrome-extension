(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.contentScraper = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var jquery = require('jquery-deferred');
/**
 * @url http://jsperf.com/blob-base64-conversion
 * @type {{blobToBase64: blobToBase64, base64ToBlob: base64ToBlob}}
 */
var Base64 = {

  blobToBase64: function (blob) {
    var deferredResponse = jquery.Deferred();
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      deferredResponse.resolve(base64);
    };
    reader.readAsDataURL(blob);

    return deferredResponse.promise();
  },

  base64ToBlob: function (base64, mimeType) {
    var deferredResponse = jquery.Deferred();
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view], { type: mimeType });
    deferredResponse.resolve(blob);

    return deferredResponse.promise();
  }
};

module.exports = Base64;

},{"jquery-deferred":29}],2:[function(require,module,exports){
var jquery = require('jquery-deferred');
/**
 * @author Martins Balodis
 *
 * An alternative version of $.when which can be used to execute asynchronous
 * calls sequentially one after another.
 *
 * @returns jqueryDeferred().promise()
 */
module.exports = function whenCallSequentially(functionCalls) {
  var deferredResonse = jquery.Deferred();
  var resultData = [];

  // nothing to do
  if (functionCalls.length === 0) {
    return deferredResonse.resolve(resultData).promise();
  }

  var currentDeferred = functionCalls.shift()();
  // execute synchronous calls synchronously
  while (currentDeferred.state() === 'resolved') {
    currentDeferred.done(function (data) {
      resultData.push(data);
    });
    if (functionCalls.length === 0) {
      return deferredResonse.resolve(resultData).promise();
    }
    currentDeferred = functionCalls.shift()();
  }

  // handle async calls
  var interval = setInterval(function () {
    // handle mixed sync calls
    while (currentDeferred.state() === 'resolved') {
      currentDeferred.done(function (data) {
        resultData.push(data);
      });
      if (functionCalls.length === 0) {
        clearInterval(interval);
        deferredResonse.resolve(resultData);
        break;
      }
      currentDeferred = functionCalls.shift()();
    }
  }, 10);

  return deferredResonse.promise();
};

},{"jquery-deferred":29}],3:[function(require,module,exports){
var StoreDevtools = require('./StoreDevtools');
var SitemapController = require('./Controller');

$(function () {
  // init bootstrap alerts
  $('.alert').alert();

  var store = new StoreDevtools({ $, document, window });
  new SitemapController({
    store: store,
    templateDir: 'views/'
  }, { $, document, window });
});

},{"./Controller":7,"./StoreDevtools":24}],4:[function(require,module,exports){
var jquery = require('jquery-deferred');
/**
 * ContentScript that can be called from anywhere within the extension
 */
var BackgroundScript = {

  dummy: function () {
    return jquery.Deferred().resolve('dummy').promise();
  },

  /**
   * Returns the id of the tab that is visible to user
   * @returns jquery.Deferred() integer
   */
  getActiveTabId: function () {
    var deferredResponse = jquery.Deferred();

    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function (tabs) {
      if (tabs.length < 1) {
        // @TODO must be running within popup. maybe find another active window?
        deferredResponse.reject("couldn't find the active tab");
      } else {
        var tabId = tabs[0].id;
        deferredResponse.resolve(tabId);
      }
    });
    return deferredResponse.promise();
  },

  /**
   * Execute a function within the active tab within content script
   * @param request.fn	function to call
   * @param request.request	request that will be passed to the function
   */
  executeContentScript: function (request) {
    var reqToContentScript = {
      contentScriptCall: true,
      fn: request.fn,
      request: request.request
    };
    var deferredResponse = jquery.Deferred();
    var deferredActiveTabId = this.getActiveTabId();
    deferredActiveTabId.done(function (tabId) {
      chrome.tabs.sendMessage(tabId, reqToContentScript, function (response) {
        deferredResponse.resolve(response);
      });
    });

    return deferredResponse;
  }
};

module.exports = BackgroundScript;

},{"jquery-deferred":29}],5:[function(require,module,exports){
var ContentSelector = require('./ContentSelector');
var jquery = require('jquery-deferred');
/**
 * ContentScript that can be called from anywhere within the extension
 */
var ContentScript = {

  /**
   * Fetch
   * @param request.CSSSelector	css selector as string
   * @returns jquery.Deferred()
   */
  getHTML: function (request, options) {
    var $ = options.$;
    var deferredHTML = jquery.Deferred();
    var html = $(request.CSSSelector).clone().wrap('<p>').parent().html();
    deferredHTML.resolve(html);
    return deferredHTML.promise();
  },

  /**
   * Removes current content selector if is in use within the page
   * @returns jquery.Deferred()
   */
  removeCurrentContentSelector: function () {
    var deferredResponse = jquery.Deferred();
    var contentSelector = window.cs;
    if (contentSelector === undefined) {
      deferredResponse.resolve();
    } else {
      contentSelector.removeGUI();
      window.cs = undefined;
      deferredResponse.resolve();
    }

    return deferredResponse.promise();
  },

  /**
   * Select elements within the page
   * @param request.parentCSSSelector
   * @param request.allowedElements
   */
  selectSelector: function (request, options) {
    var $ = options.$;
    var deferredResponse = jquery.Deferred();

    this.removeCurrentContentSelector().done(function () {
      var contentSelector = new ContentSelector({
        parentCSSSelector: request.parentCSSSelector,
        allowedElements: request.allowedElements
      }, { $, document, window });
      window.cs = contentSelector;

      var deferredCSSSelector = contentSelector.getCSSSelector();
      deferredCSSSelector.done(function (response) {
        this.removeCurrentContentSelector().done(function () {
          deferredResponse.resolve(response);
          window.cs = undefined;
        });
      }.bind(this)).fail(function (message) {
        deferredResponse.reject(message);
        window.cs = undefined;
      });
    }.bind(this));

    return deferredResponse.promise();
  },

  /**
   * Preview elements
   * @param request.parentCSSSelector
   * @param request.elementCSSSelector
   */
  previewSelector: function (request, options) {
    var $ = options.$;
    var deferredResponse = jquery.Deferred();
    this.removeCurrentContentSelector().done(function () {
      var contentSelector = new ContentSelector({
        parentCSSSelector: request.parentCSSSelector
      }, { $, document, window });
      window.cs = contentSelector;

      var deferredSelectorPreview = contentSelector.previewSelector(request.elementCSSSelector);
      deferredSelectorPreview.done(function () {
        deferredResponse.resolve();
      }).fail(function (message) {
        deferredResponse.reject(message);
        window.cs = undefined;
      });
    });
    return deferredResponse;
  }
};

module.exports = ContentScript;

},{"./ContentSelector":6,"jquery-deferred":29}],6:[function(require,module,exports){
var ElementQuery = require('./ElementQuery');
var jquery = require('jquery-deferred');
var CssSelector = require('css-selector').CssSelector;
/**
 * @param options.parentCSSSelector	Elements can be only selected within this element
 * @param options.allowedElements	Elements that can only be selected
 * @constructor
 */
var ContentSelector = function (options, moreOptions) {
  // deferred response
  this.deferredCSSSelectorResponse = jquery.Deferred();

  this.allowedElements = options.allowedElements;
  this.parentCSSSelector = options.parentCSSSelector.trim();
  this.alert = options.alert || function (txt) {
    alert(txt);
  };

  this.$ = moreOptions.$;
  this.document = moreOptions.document;
  this.window = moreOptions.window;
  if (!this.$) throw new Error('Missing jquery in content selector');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");
  if (this.parentCSSSelector) {
    this.parent = this.$(this.parentCSSSelector)[0];

    //  handle situation when parent selector not found
    if (this.parent === undefined) {
      this.deferredCSSSelectorResponse.reject('parent selector not found');
      this.alert('Parent element not found!');
    }
  } else {
    this.parent = this.$('body')[0];
  }
};

ContentSelector.prototype = {

  /**
   * get css selector selected by the user
   */
  getCSSSelector: function (request) {
    if (this.deferredCSSSelectorResponse.state() !== 'rejected') {
      // elements that are selected by the user
      this.selectedElements = [];
      // element selected from top
      this.top = 0;

      // initialize css selector
      this.initCssSelector(false);

      this.initGUI();
    }

    return this.deferredCSSSelectorResponse.promise();
  },

  getCurrentCSSSelector: function () {
    if (this.selectedElements && this.selectedElements.length > 0) {
      var cssSelector;

      // handle special case when parent is selected
      if (this.isParentSelected()) {
        if (this.selectedElements.length === 1) {
          cssSelector = '_parent_';
        } else if (this.$('#-selector-toolbar [name=diferentElementSelection]').prop('checked')) {
          var selectedElements = this.selectedElements.clone();
          selectedElements.splice(selectedElements.indexOf(this.parent), 1);
          cssSelector = '_parent_, ' + this.cssSelector.getCssSelector(selectedElements, this.top);
        } else {
          // will trigger error where multiple selections are not allowed
          cssSelector = this.cssSelector.getCssSelector(this.selectedElements, this.top);
        }
      } else {
        cssSelector = this.cssSelector.getCssSelector(this.selectedElements, this.top);
      }

      return cssSelector;
    }
    return '';
  },

  isParentSelected: function () {
    return this.selectedElements.indexOf(this.parent) !== -1;
  },

  /**
   * initialize or reconfigure css selector class
   * @param allowMultipleSelectors
   */
  initCssSelector: function (allowMultipleSelectors) {
    this.cssSelector = new CssSelector({
      enableSmartTableSelector: true,
      parent: this.parent,
      allowMultipleSelectors: allowMultipleSelectors,
      ignoredClasses: ['-sitemap-select-item-selected', '-sitemap-select-item-hover', '-sitemap-parent', '-web-scraper-img-on-top', '-web-scraper-selection-active'],
      query: this.$
    });
  },

  previewSelector: function (elementCSSSelector) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (this.deferredCSSSelectorResponse.state() !== 'rejected') {
      this.highlightParent();
      $(ElementQuery(elementCSSSelector, this.parent, { $, document, window })).addClass('-sitemap-select-item-selected');
      this.deferredCSSSelectorResponse.resolve();
    }

    return this.deferredCSSSelectorResponse.promise();
  },

  initGUI: function () {
    var document = this.document;
    this.highlightParent();

    // all elements except toolbar
    this.$allElements = this.$(this.allowedElements + ':not(#-selector-toolbar):not(#-selector-toolbar *)', this.parent);
    // allow selecting parent also
    if (this.parent !== document.body) {
      this.$allElements.push(this.parent);
    }

    this.bindElementHighlight();
    this.bindElementSelection();
    this.bindKeyboardSelectionManipulations();
    this.attachToolbar();
    this.bindMultipleGroupCheckbox();
    this.bindMultipleGroupPopupHide();
    this.bindMoveImagesToTop();
  },

  bindElementSelection: function () {
    this.$allElements.bind('click.elementSelector', function (e) {
      var element = e.currentTarget;
      if (this.selectedElements.indexOf(element) === -1) {
        this.selectedElements.push(element);
      }
      this.highlightSelectedElements();

      // Cancel all other events
      return false;
    }.bind(this));
  },

  /**
   * Add to select elements the element that is under the mouse
   */
  selectMouseOverElement: function () {
    var element = this.mouseOverElement;
    if (element) {
      this.selectedElements.push(element);
      this.highlightSelectedElements();
    }
  },

  bindElementHighlight: function () {
    var $ = this.$;
    $(this.$allElements).bind('mouseover.elementSelector', function (e) {
      var element = e.currentTarget;
      this.mouseOverElement = element;
      $(element).addClass('-sitemap-select-item-hover');
      return false;
    }.bind(this)).bind('mouseout.elementSelector', function (e) {
      var element = e.currentTarget;
      this.mouseOverElement = null;
      $(element).removeClass('-sitemap-select-item-hover');
      return false;
    }.bind(this));
  },

  bindMoveImagesToTop: function () {
    var $ = this.$;
    $('body').addClass('-web-scraper-selection-active');

    // do this only when selecting images
    if (this.allowedElements === 'img') {
      $('img').filter(function (i, element) {
        return $(element).css('position') === 'static';
      }).addClass('-web-scraper-img-on-top');
    }
  },

  unbindMoveImagesToTop: function () {
    this.$('body.-web-scraper-selection-active').removeClass('-web-scraper-selection-active');
    this.$('img.-web-scraper-img-on-top').removeClass('-web-scraper-img-on-top');
  },

  selectChild: function () {
    this.top--;
    if (this.top < 0) {
      this.top = 0;
    }
  },
  selectParent: function () {
    this.top++;
  },

  // User with keyboard arrows can select child or paret elements of selected elements.
  bindKeyboardSelectionManipulations: function () {
    var $ = this.$;
    var document = this.document;
    // check for focus
    var lastFocusStatus;
    this.keyPressFocusInterval = setInterval(function () {
      var focus = document.hasFocus();
      if (focus === lastFocusStatus) return;
      lastFocusStatus = focus;

      $('#-selector-toolbar .key-button').toggleClass('hide', !focus);
      $('#-selector-toolbar .key-events').toggleClass('hide', focus);
    }, 200);

    // Using up/down arrows user can select elements from top of the
    // selected element
    $(document).bind('keydown.selectionManipulation', function (event) {
      // select child C
      if (event.keyCode === 67) {
        this.animateClickedKey($('#-selector-toolbar .key-button-child'));
        this.selectChild();
      }
      // select parent P
      else if (event.keyCode === 80) {
          this.animateClickedKey($('#-selector-toolbar .key-button-parent'));
          this.selectParent();
        }
        // select element
        else if (event.keyCode === 83) {
            this.animateClickedKey($('#-selector-toolbar .key-button-select'));
            this.selectMouseOverElement();
          }

      this.highlightSelectedElements();
    }.bind(this));
  },

  animateClickedKey: function (element) {
    var $ = this.$;
    $(element).removeClass('clicked').removeClass('clicked-animation');
    setTimeout(function () {
      $(element).addClass('clicked');
      setTimeout(function () {
        $(element).addClass('clicked-animation');
      }, 100);
    }, 1);
  },

  highlightSelectedElements: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    try {
      var resultCssSelector = this.getCurrentCSSSelector();

      $('body #-selector-toolbar .selector').text(resultCssSelector);
      // highlight selected elements
      $('.-sitemap-select-item-selected').removeClass('-sitemap-select-item-selected');
      $(ElementQuery(resultCssSelector, this.parent, { $, document, window })).addClass('-sitemap-select-item-selected');
    } catch (err) {
      if (err === 'found multiple element groups, but allowMultipleSelectors disabled') {
        console.log('extension/scripts/ContentSelector.js:267:20:\'multiple different element selection disabled\'', 'multiple different element selection disabled');

        this.showMultipleGroupPopup();
        // remove last added element
        this.selectedElements.pop();
        this.highlightSelectedElements();
      }
    }
  },

  showMultipleGroupPopup: function () {
    this.$('#-selector-toolbar .popover').attr('style', 'display:block !important;');
  },

  hideMultipleGroupPopup: function () {
    this.$('#-selector-toolbar .popover').attr('style', '');
  },

  bindMultipleGroupPopupHide: function () {
    this.$('#-selector-toolbar .popover .close').click(this.hideMultipleGroupPopup.bind(this));
  },

  unbindMultipleGroupPopupHide: function () {
    this.$('#-selector-toolbar .popover .close').unbind('click');
  },

  bindMultipleGroupCheckbox: function () {
    var $ = this.$;
    $('#-selector-toolbar [name=diferentElementSelection]').change(function (e) {
      if ($(e.currentTarget).is(':checked')) {
        this.initCssSelector(true);
      } else {
        this.initCssSelector(false);
      }
    }.bind(this));
  },
  unbindMultipleGroupCheckbox: function () {
    this.$('#-selector-toolbar .diferentElementSelection').unbind('change');
  },

  attachToolbar: function () {
    var $ = this.$;
    var $toolbar = '<div id="-selector-toolbar">' + '<div class="list-item"><div class="selector-container"><div class="selector"></div></div></div>' + '<div class="input-group-addon list-item">' + '<input type="checkbox" title="Enable different type element selection" name="diferentElementSelection">' + '<div class="popover top">' + '<div class="close">×</div>' + '<div class="arrow"></div>' + '<div class="popover-content">' + '<div class="txt">' + 'Different type element selection is disabled. If the element ' + 'you clicked should also be included then enable this and ' + 'click on the element again. Usually this is not needed.' + '</div>' + '</div>' + '</div>' + '</div>' + '<div class="list-item key-events"><div title="Click here to enable key press events for selection">Enable key events</div></div>' + '<div class="list-item key-button key-button-select hide" title="Use S key to select element">S</div>' + '<div class="list-item key-button key-button-parent hide" title="Use P key to select parent">P</div>' + '<div class="list-item key-button key-button-child hide" title="Use C key to select child">C</div>' + '<div class="list-item done-selecting-button">Done selecting!</div>' + '</div>';
    $('body').append($toolbar);

    $('body #-selector-toolbar .done-selecting-button').click(function () {
      this.selectionFinished();
    }.bind(this));
  },
  highlightParent: function () {
    var $ = this.$;
    // do not highlight parent if its the body
    if (!$(this.parent).is('body') && !$(this.parent).is('#webpage')) {
      $(this.parent).addClass('-sitemap-parent');
    }
  },

  unbindElementSelection: function () {
    var $ = this.$;
    $(this.$allElements).unbind('click.elementSelector');
    // remove highlighted element classes
    this.unbindElementSelectionHighlight();
  },
  unbindElementSelectionHighlight: function () {
    this.$('.-sitemap-select-item-selected').removeClass('-sitemap-select-item-selected');
    this.$('.-sitemap-parent').removeClass('-sitemap-parent');
  },
  unbindElementHighlight: function () {
    this.$(this.$allElements).unbind('mouseover.elementSelector').unbind('mouseout.elementSelector');
  },
  unbindKeyboardSelectionMaipulatios: function () {
    this.$(document).unbind('keydown.selectionManipulation');
    clearInterval(this.keyPressFocusInterval);
  },
  removeToolbar: function () {
    this.$('body #-selector-toolbar a').unbind('click');
    this.$('#-selector-toolbar').remove();
  },

  /**
   * Remove toolbar and unbind events
   */
  removeGUI: function () {
    this.unbindElementSelection();
    this.unbindElementHighlight();
    this.unbindKeyboardSelectionMaipulatios();
    this.unbindMultipleGroupPopupHide();
    this.unbindMultipleGroupCheckbox();
    this.unbindMoveImagesToTop();
    this.removeToolbar();
  },

  selectionFinished: function () {
    var resultCssSelector = this.getCurrentCSSSelector();

    this.deferredCSSSelectorResponse.resolve({
      CSSSelector: resultCssSelector
    });
  }
};

module.exports = ContentSelector;

},{"./ElementQuery":8,"css-selector":28,"jquery-deferred":29}],7:[function(require,module,exports){
var selectors = require('./Selectors');
var Selector = require('./Selector');
var SelectorTable = selectors.SelectorTable;
var Sitemap = require('./Sitemap');
// var SelectorGraphv2 = require('./SelectorGraphv2')
var getBackgroundScript = require('./getBackgroundScript');
var getContentScript = require('./getContentScript');
var SitemapController = function (options, moreOptions) {
  this.$ = moreOptions.$;
  this.document = moreOptions.document;
  this.window = moreOptions.window;
  if (!this.$) throw new Error('Missing jquery in Controller');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");
  for (var i in options) {
    this[i] = options[i];
  }
  this.init();
};

SitemapController.prototype = {

  backgroundScript: getBackgroundScript('DevTools'),
  contentScript: getContentScript('DevTools'),

  control: function (controls) {
    var controller = this;

    for (var selector in controls) {
      for (var event in controls[selector]) {
        this.$(document).on(event, selector, function (selector, event) {
          return function () {
            var continueBubbling = controls[selector][event].call(controller, this);
            if (continueBubbling !== true) {
              return false;
            }
          };
        }(selector, event));
      }
    }
  },

  /**
   * Loads templates for ICanHaz
   */
  loadTemplates: function (cbAllTemplatesLoaded) {
    var templateIds = ['Viewport', 'SitemapList', 'SitemapListItem', 'SitemapCreate', 'SitemapStartUrlField', 'SitemapImport', 'SitemapExport', 'SitemapBrowseData', 'SitemapHeadlessScrapeConfig', 'SitemapScrapeConfig', 'SitemapExportDataCSV', 'SitemapEditMetadata', 'SelectorList', 'SelectorListItem', 'SelectorEdit', 'SelectorEditTableColumn',
    // 'SitemapSelectorGraph',
    'DataPreview'];
    var templatesLoaded = 0;
    var cbLoaded = function (templateId, template) {
      templatesLoaded++;
      ich.addTemplate(templateId, template);
      if (templatesLoaded === templateIds.length) {
        cbAllTemplatesLoaded();
      }
    };

    templateIds.forEach(function (templateId) {
      this.$.get(this.templateDir + templateId + '.html', cbLoaded.bind(this, templateId));
    }.bind(this));
  },

  init: function () {
    this.loadTemplates(function () {
      // currently viewed objects
      this.clearState();

      // render main viewport
      ich.Viewport().appendTo('body');

      // cancel all form submits
      this.$('form').bind('submit', function () {
        return false;
      });

      this.control({
        '#sitemaps-nav-button': {
          click: this.showSitemaps
        },
        '#create-sitemap-create-nav-button': {
          click: this.showCreateSitemap
        },
        '#create-sitemap-import-nav-button': {
          click: this.showImportSitemapPanel
        },
        '#sitemap-export-nav-button': {
          click: this.showSitemapExportPanel
        },
        '#sitemap-export-data-csv-nav-button': {
          click: this.showSitemapExportDataCsvPanel
        },
        '#submit-create-sitemap': {
          click: this.createSitemap
        },
        '#submit-import-sitemap': {
          click: this.importSitemap
        },
        '#sitemap-edit-metadata-nav-button': {
          click: this.editSitemapMetadata
        },
        '#sitemap-selector-list-nav-button': {
          click: this.showSitemapSelectorList
        }, /*,        '#sitemap-selector-graph-nav-button': {
           click: this.showSitemapSelectorGraph
           } */
        '#sitemap-browse-nav-button': {
          click: this.browseSitemapData
        },
        'button#submit-edit-sitemap': {
          click: this.editSitemapMetadataSave
        },
        '#edit-sitemap-metadata-form': {
          submit: function () {
            return false;
          }
        },
        '#sitemaps tr': {
          click: this.editSitemap
        },
        '#sitemaps button[action=delete-sitemap]': {
          click: this.deleteSitemap
        },
        '#sitemap-scrape-nav-button': {
          click: this.showScrapeSitemapConfigPanel

        },
        '#sitemap-headless-scrape-nav-button': {
          click: this.showHeadlessScrapeSitemapConfigPanel
        },
        '#submit-scrape-sitemap-form': {
          submit: function () {
            return false;
          }
        },
        '#submit-scrape-sitemap': {
          click: this.scrapeSitemap
        },
        '#submit-headless-scrape-sitemap': {
          click: this.headlessScrapeSitemap
        },
        '#sitemaps button[action=browse-sitemap-data]': {
          click: this.sitemapListBrowseSitemapData
        },
        '#sitemaps button[action=csv-download-sitemap-data]': {
          click: this.downloadSitemapData
        },
        // @TODO move to tr
        '#selector-tree tbody tr': {
          click: this.showChildSelectors
        },
        '#selector-tree .breadcrumb a': {
          click: this.treeNavigationshowSitemapSelectorList
        },
        '#selector-tree tr button[action=edit-selector]': {
          click: this.editSelector
        },
        '#edit-selector select[name=type]': {
          change: this.selectorTypeChanged
        },
        '#edit-selector button[action=save-selector]': {
          click: this.saveSelector
        },
        '#edit-selector button[action=cancel-selector-editing]': {
          click: this.cancelSelectorEditing
        },
        '#edit-selector #selectorId': {
          keyup: this.updateSelectorParentListOnIdChange
        },
        '#selector-tree button[action=add-selector]': {
          click: this.addSelector
        },
        '#selector-tree tr button[action=delete-selector]': {
          click: this.deleteSelector
        },
        '#selector-tree tr button[action=preview-selector]': {
          click: this.previewSelectorFromSelectorTree
        },
        '#selector-tree tr button[action=data-preview-selector]': {
          click: this.previewSelectorDataFromSelectorTree
        },
        '#edit-selector button[action=select-selector]': {
          click: this.selectSelector
        },
        '#edit-selector button[action=select-table-header-row-selector]': {
          click: this.selectTableHeaderRowSelector
        },
        '#edit-selector button[action=select-table-data-row-selector]': {
          click: this.selectTableDataRowSelector
        },
        '#edit-selector button[action=preview-selector]': {
          click: this.previewSelector
        },
        '#edit-selector button[action=preview-click-element-selector]': {
          click: this.previewClickElementSelector
        },
        '#edit-selector button[action=preview-table-row-selector]': {
          click: this.previewTableRowSelector
        },
        '#edit-selector button[action=preview-selector-data]': {
          click: this.previewSelectorDataFromSelectorEditing
        },
        'button.add-extra-start-url': {
          click: this.addStartUrl
        },
        'button.remove-start-url': {
          click: this.removeStartUrl
        }
      });
      this.showSitemaps();
    }.bind(this));
  },

  clearState: function () {
    this.state = {
      // sitemap that is currently open
      currentSitemap: null,
      // selector ids that are shown in the navigation
      editSitemapBreadcumbsSelectors: null,
      currentParentSelectorId: null,
      currentSelector: null
    };
  },

  setStateEditSitemap: function (sitemap) {
    this.state.currentSitemap = sitemap;
    this.state.editSitemapBreadcumbsSelectors = [{ id: '_root' }];
    this.state.currentParentSelectorId = '_root';
  },

  setActiveNavigationButton: function (navigationId) {
    this.$('.nav .active').removeClass('active');
    this.$('#' + navigationId + '-nav-button').closest('li').addClass('active');

    if (navigationId.match(/^sitemap-/)) {
      this.$('#sitemap-nav-button').removeClass('disabled');
      this.$('#sitemap-nav-button').closest('li').addClass('active');
      this.$('#navbar-active-sitemap-id').text('(' + this.state.currentSitemap._id + ')');
    } else {
      this.$('#sitemap-nav-button').addClass('disabled');
      this.$('#navbar-active-sitemap-id').text('');
    }

    if (navigationId.match(/^create-sitemap-/)) {
      this.$('#create-sitemap-nav-button').closest('li').addClass('active');
    }
  },

  /**
   * Simple info popup for sitemap start url input field
   */
  initMultipleStartUrlHelper: function () {
    this.$('#startUrl').popover({
      title: 'Multiple start urls',
      html: true,
      content: 'You can create ranged start urls like this:<br />http://example.com/[1-100].html',
      placement: 'bottom'
    }).blur(function () {
      this.$(this).popover('hide');
    });
  },

  /**
   * Returns bootstrapValidator object for current form in viewport
   */
  getFormValidator: function () {
    var validator = this.$('#viewport form').data('bootstrapValidator');
    return validator;
  },

  /**
   * Returns whether current form in the viewport is valid
   * @returns {Boolean}
   */
  isValidForm: function () {
    var validator = this.getFormValidator();

    // validator.validate();
    // validate method calls submit which is not needed in this case.
    for (var field in validator.options.fields) {
      validator.validateField(field);
    }

    var valid = validator.isValid();
    return valid;
  },

  /**
   * Add validation to sitemap creation or editing form
   */
  initSitemapValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        '_id': {
          validators: {
            notEmpty: {
              message: 'The sitemap id is required and cannot be empty'
            },
            stringLength: {
              min: 3,
              message: 'The sitemap id should be atleast 3 characters long'
            },
            regexp: {
              regexp: /^[a-z][a-z0-9_$()+\-/]+$/,
              message: 'Only lowercase characters (a-z), digits (0-9), or any of the characters _, $, (, ), +, -, and / are allowed. Must begin with a letter.'
            },
            // placeholder for sitemap id existance validation
            callback: {
              message: 'Sitemap with this id already exists',
              callback: function (value, validator) {
                return true;
              }
            }
          }
        },
        'startUrl[]': {
          validators: {
            notEmpty: {
              message: 'The start URL is required and cannot be empty'
            },
            uri: {
              message: 'The start URL is not a valid URL'
            }
          }
        }
      }
    });
  },

  showCreateSitemap: function () {
    this.setActiveNavigationButton('create-sitemap-create');
    var sitemapForm = ich.SitemapCreate();
    this.$('#viewport').html(sitemapForm);
    this.initMultipleStartUrlHelper();
    this.initSitemapValidation();

    return true;
  },

  initImportStiemapValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        '_id': {
          validators: {
            stringLength: {
              min: 3,
              message: 'The sitemap id should be atleast 3 characters long'
            },
            regexp: {
              regexp: /^[a-z][a-z0-9_$()+\-/]+$/,
              message: 'Only lowercase characters (a-z), digits (0-9), or any of the characters _, $, (, ), +, -, and / are allowed. Must begin with a letter.'
            },
            // placeholder for sitemap id existance validation
            callback: {
              message: 'Sitemap with this id already exists',
              callback: function (value, validator) {
                return true;
              }
            }
          }
        },
        sitemapJSON: {
          validators: {
            notEmpty: {
              message: 'Sitemap JSON is required and cannot be empty'
            },
            callback: {
              message: 'JSON is not valid',
              callback: function (value, validator) {
                try {
                  JSON.parse(value);
                } catch (e) {
                  return false;
                }
                return true;
              }
            }
          }
        }
      }
    });
  },

  showImportSitemapPanel: function () {
    this.setActiveNavigationButton('create-sitemap-import');
    var sitemapForm = ich.SitemapImport();
    this.$('#viewport').html(sitemapForm);
    this.initImportStiemapValidation();
    return true;
  },

  showSitemapExportPanel: function () {
    this.setActiveNavigationButton('sitemap-export');
    var sitemap = this.state.currentSitemap;
    var sitemapJSON = sitemap.exportSitemap();
    var sitemapExportForm = ich.SitemapExport({
      sitemapJSON: sitemapJSON
    });
    this.$('#viewport').html(sitemapExportForm);
    return true;
  },

  showSitemaps: function () {
    this.clearState();
    this.setActiveNavigationButton('sitemaps');

    this.store.getAllSitemaps(function (sitemaps) {
      var $sitemapListPanel = ich.SitemapList();
      sitemaps.forEach(function (sitemap) {
        var $sitemap = ich.SitemapListItem(sitemap);
        $sitemap.data('sitemap', sitemap);
        $sitemapListPanel.find('tbody').append($sitemap);
      });
      this.$('#viewport').html($sitemapListPanel);
    });
  },

  getSitemapFromMetadataForm: function () {
    var id = this.$('#viewport form input[name=_id]').val();
    var $startUrlInputs = this.$('#viewport form .input-start-url');
    var startUrl;
    if ($startUrlInputs.length === 1) {
      startUrl = $startUrlInputs.val();
    } else {
      startUrl = [];
      $startUrlInputs.each(function (i, element) {
        startUrl.push(this.$(element).val());
      });
    }

    return {
      id: id,
      startUrl: startUrl
    };
  },

  createSitemap: function (form) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    // cancel submit if invalid form
    if (!this.isValidForm()) {
      return false;
    }

    var sitemapData = this.getSitemapFromMetadataForm();

    // check whether sitemap with this id already exist
    this.store.sitemapExists(sitemapData.id, function (sitemapExists) {
      if (sitemapExists) {
        var validator = this.getFormValidator();
        validator.updateStatus('_id', 'INVALID', 'callback');
      } else {
        var sitemap = new Sitemap({
          _id: sitemapData.id,
          startUrl: sitemapData.startUrl,
          selectors: []
        }, { $, document, window });
        this.store.createSitemap(sitemap, function (sitemap) {
          this._editSitemap(sitemap, ['_root']);
        }.bind(this, sitemap));
      }
    }.bind(this));
  },

  importSitemap: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    // cancel submit if invalid form
    if (!this.isValidForm()) {
      return false;
    }

    // load data from form
    var sitemapJSON = this.$('[name=sitemapJSON]').val();
    var id = this.$('input[name=_id]').val();
    var sitemap = new Sitemap(null, { $, document, window });
    sitemap.importSitemap(sitemapJSON);
    if (id.length) {
      sitemap._id = id;
    }
    // check whether sitemap with this id already exist
    this.store.sitemapExists(sitemap._id, function (sitemapExists) {
      if (sitemapExists) {
        var validator = this.getFormValidator();
        validator.updateStatus('_id', 'INVALID', 'callback');
      } else {
        this.store.createSitemap(sitemap, function (sitemap) {
          this._editSitemap(sitemap, ['_root']);
        }.bind(this, sitemap));
      }
    }.bind(this));
  },

  editSitemapMetadata: function (button) {
    this.setActiveNavigationButton('sitemap-edit-metadata');

    var sitemap = this.state.currentSitemap;
    var $sitemapMetadataForm = ich.SitemapEditMetadata(sitemap);
    this.$('#viewport').html($sitemapMetadataForm);
    this.initMultipleStartUrlHelper();
    this.initSitemapValidation();

    return true;
  },

  editSitemapMetadataSave: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var sitemap = this.state.currentSitemap;
    var sitemapData = this.getSitemapFromMetadataForm();

    // cancel submit if invalid form
    if (!this.isValidForm()) {
      return false;
    }

    // check whether sitemap with this id already exist
    this.store.sitemapExists(sitemapData.id, function (sitemapExists) {
      if (sitemap._id !== sitemapData.id && sitemapExists) {
        var validator = this.getFormValidator();
        validator.updateStatus('_id', 'INVALID', 'callback');
        return;
      }

      // change data
      sitemap.startUrl = sitemapData.startUrl;

      // just change sitemaps url
      if (sitemapData.id === sitemap._id) {
        this.store.saveSitemap(sitemap, function (sitemap) {
          this.showSitemapSelectorList();
        }.bind(this));
      } else {
        // id changed. we need to delete the old one and create a new one
        var newSitemap = new Sitemap(sitemap, { $, document, window });
        var oldSitemap = sitemap;
        newSitemap._id = sitemapData.id;
        this.store.createSitemap(newSitemap, function (newSitemap) {
          this.store.deleteSitemap(oldSitemap, function () {
            this.state.currentSitemap = newSitemap;
            this.showSitemapSelectorList();
          }.bind(this));
        }.bind(this));
      }
    }.bind(this));
  },

  /**
   * Callback when sitemap edit button is clicked in sitemap grid
   */
  editSitemap: function (tr) {
    var sitemap = this.$(tr).data('sitemap');
    this._editSitemap(sitemap);
  },
  _editSitemap: function (sitemap) {
    this.setStateEditSitemap(sitemap);
    this.setActiveNavigationButton('sitemap');

    this.showSitemapSelectorList();
  },
  showSitemapSelectorList: function () {
    this.setActiveNavigationButton('sitemap-selector-list');

    var sitemap = this.state.currentSitemap;
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors;
    var parentSelectorId = this.state.currentParentSelectorId;

    var $selectorListPanel = ich.SelectorList({
      parentSelectors: parentSelectors
    });
    var selectors = sitemap.getDirectChildSelectors(parentSelectorId);
    selectors.forEach(function (selector) {
      var $selector = ich.SelectorListItem(selector);
      $selector.data('selector', selector);
      $selectorListPanel.find('tbody').append($selector);
    });
    this.$('#viewport').html($selectorListPanel);

    return true;
  }, /*
     showSitemapSelectorGraph: function () {
     this.setActiveNavigationButton('sitemap-selector-graph')
     var sitemap = this.state.currentSitemap
     var $selectorGraphPanel = ich.SitemapSelectorGraph()
     $('#viewport').html($selectorGraphPanel)
     var graphDiv = $('#selector-graph')[0]
     var graph = new SelectorGraphv2(sitemap)
     graph.draw(graphDiv, $(document).width(), 200)
     return true
     }, */
  showChildSelectors: function (tr) {
    var selector = this.$(tr).data('selector');
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors;
    this.state.currentParentSelectorId = selector.id;
    parentSelectors.push(selector);

    this.showSitemapSelectorList();
  },

  treeNavigationshowSitemapSelectorList: function (button) {
    var parentSelectors = this.state.editSitemapBreadcumbsSelectors;
    var controller = this;
    this.$('#selector-tree .breadcrumb li a').each(function (i, parentSelectorButton) {
      if (parentSelectorButton === button) {
        parentSelectors.splice(i + 1);
        controller.state.currentParentSelectorId = parentSelectors[i].id;
      }
    });
    this.showSitemapSelectorList();
  },

  initSelectorValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        'id': {
          validators: {
            notEmpty: {
              message: 'Sitemap id required and cannot be empty'
            },
            stringLength: {
              min: 3,
              message: 'The sitemap id should be atleast 3 characters long'
            },
            regexp: {
              regexp: /^[^_].*$/,
              message: 'Selector id cannot start with an underscore _'
            }
          }
        },
        selector: {
          validators: {
            notEmpty: {
              message: 'Selector is required and cannot be empty'
            }
          }
        },
        regex: {
          validators: {
            callback: {
              message: 'JavaScript does not support regular expressions that can match 0 characters.',
              callback: function (value, validator) {
                // allow no regex
                if (!value) {
                  return true;
                }

                var matches = ''.match(new RegExp(value));
                if (matches !== null && matches[0] === '') {
                  return false;
                } else {
                  return true;
                }
              }
            }
          }
        },
        clickElementSelector: {
          validators: {
            notEmpty: {
              message: 'Click selector is required and cannot be empty'
            }
          }
        },
        tableHeaderRowSelector: {
          validators: {
            notEmpty: {
              message: 'Header row selector is required and cannot be empty'
            }
          }
        },
        tableDataRowSelector: {
          validators: {
            notEmpty: {
              message: 'Data row selector is required and cannot be empty'
            }
          }
        },
        delay: {
          validators: {
            numeric: {
              message: 'Delay must be numeric'
            }
          }
        },
        parentSelectors: {
          validators: {
            notEmpty: {
              message: 'You must choose at least one parent selector'
            },
            callback: {
              message: 'Cannot handle recursive element selectors',
              callback: function (value, validator, $field) {
                var sitemap = this.getCurrentlyEditedSelectorSitemap();
                return !sitemap.selectors.hasRecursiveElementSelectors();
              }.bind(this)
            }
          }
        }
      }
    });
  },
  editSelector: function (button) {
    var selector = this.$(button).closest('tr').data('selector');
    this._editSelector(selector);
  },
  updateSelectorParentListOnIdChange: function () {
    var selector = this.getCurrentlyEditedSelector();
    this.$('.currently-edited').val(selector.id).text(selector.id);
  },
  _editSelector: function (selector) {
    var sitemap = this.state.currentSitemap;
    var selectorIds = sitemap.getPossibleParentSelectorIds();

    var $editSelectorForm = ich.SelectorEdit({
      selector: selector,
      selectorIds: selectorIds,
      selectorTypes: [{
        type: 'SelectorText',
        title: 'Text'
      }, {
        type: 'SelectorLink',
        title: 'Link'
      }, {
        type: 'SelectorPopupLink',
        title: 'Popup Link'
      }, {
        type: 'SelectorImage',
        title: 'Image'
      }, {
        type: 'SelectorTable',
        title: 'Table'
      }, {
        type: 'SelectorElementAttribute',
        title: 'Element attribute'
      }, {
        type: 'SelectorHTML',
        title: 'HTML'
      }, {
        type: 'SelectorElement',
        title: 'Element'
      }, {
        type: 'SelectorElementScroll',
        title: 'Element scroll down'
      }, {
        type: 'SelectorElementClick',
        title: 'Element click'
      }, {
        type: 'SelectorGroup',
        title: 'Grouped'
      }]
    });
    this.$('#viewport').html($editSelectorForm);
    // mark initially opened selector as currently edited
    var self = this;
    this.$('#edit-selector #parentSelectors option').each(function (i, element) {
      if (self.$(element).val() === selector.id) {
        self.$(element).addClass('currently-edited');
      }
    });

    // set clickType
    if (selector.clickType) {
      $editSelectorForm.find('[name=clickType]').val(selector.clickType);
    }
    // set clickElementUniquenessType
    if (selector.clickElementUniquenessType) {
      $editSelectorForm.find('[name=clickElementUniquenessType]').val(selector.clickElementUniquenessType);
    }

    // handle selects seperately
    $editSelectorForm.find('[name=type]').val(selector.type);
    selector.parentSelectors.forEach(function (parentSelectorId) {
      $editSelectorForm.find("#parentSelectors [value='" + parentSelectorId + "']").attr('selected', 'selected');
    });

    this.state.currentSelector = selector;
    this.selectorTypeChanged();
    this.initSelectorValidation();
  },
  selectorTypeChanged: function () {
    var type = this.$('#edit-selector select[name=type]').val();
    var features = selectors[type].getFeatures();
    this.$('#edit-selector .feature').hide();
    var self = this;
    features.forEach(function (feature) {
      self.$('#edit-selector .feature-' + feature).show();
    });

    // add this selector to possible parent selector
    var selector = this.getCurrentlyEditedSelector();
    if (selector.canHaveChildSelectors()) {
      if (this.$('#edit-selector #parentSelectors .currently-edited').length === 0) {
        var $option = this.$('<option class="currently-edited"></option>');
        $option.text(selector.id).val(selector.id);
        this.$('#edit-selector #parentSelectors').append($option);
      }
    } else {
      // remove if type doesn't allow to have child selectors
      this.$('#edit-selector #parentSelectors .currently-edited').remove();
    }
  },
  saveSelector: function (button) {
    var sitemap = this.state.currentSitemap;
    var selector = this.state.currentSelector;
    var newSelector = this.getCurrentlyEditedSelector();

    // cancel submit if invalid form
    if (!this.isValidForm()) {
      return false;
    }

    // cancel possible element selection
    this.contentScript.removeCurrentContentSelector().then(function () {
      sitemap.updateSelector(selector, newSelector);

      this.store.saveSitemap(sitemap, function () {
        this.showSitemapSelectorList();
      }.bind(this));
    }.bind(this));
  },
  /**
   * Get selector from selector editing form
   */
  getCurrentlyEditedSelector: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var id = $('#edit-selector [name=id]').val();
    var selectorsSelector = $('#edit-selector [name=selector]').val();
    var tableDataRowSelector = $('#edit-selector [name=tableDataRowSelector]').val();
    var tableHeaderRowSelector = $('#edit-selector [name=tableHeaderRowSelector]').val();
    var clickElementSelector = $('#edit-selector [name=clickElementSelector]').val();
    var type = $('#edit-selector [name=type]').val();
    var clickElementUniquenessType = $('#edit-selector [name=clickElementUniquenessType]').val();
    var clickType = $('#edit-selector [name=clickType]').val();
    var discardInitialElements = $('#edit-selector [name=discardInitialElements]').is(':checked');
    var multiple = $('#edit-selector [name=multiple]').is(':checked');
    var downloadImage = $('#edit-selector [name=downloadImage]').is(':checked');
    var clickPopup = $('#edit-selector [name=clickPopup]').is(':checked');
    var regex = $('#edit-selector [name=regex]').val();
    var delay = $('#edit-selector [name=delay]').val();
    var extractAttribute = $('#edit-selector [name=extractAttribute]').val();
    var parentSelectors = $('#edit-selector [name=parentSelectors]').val();
    var columns = [];
    var $columnHeaders = $('#edit-selector .column-header');
    var $columnNames = $('#edit-selector .column-name');
    var $columnExtracts = $('#edit-selector .column-extract');

    $columnHeaders.each(function (i) {
      var header = $($columnHeaders[i]).val();
      var name = $($columnNames[i]).val();
      var extract = $($columnExtracts[i]).is(':checked');
      columns.push({
        header: header,
        name: name,
        extract: extract
      });
    });

    var newSelector = new Selector({
      id: id,
      selector: selectorsSelector,
      tableHeaderRowSelector: tableHeaderRowSelector,
      tableDataRowSelector: tableDataRowSelector,
      clickElementSelector: clickElementSelector,
      clickElementUniquenessType: clickElementUniquenessType,
      clickType: clickType,
      discardInitialElements: discardInitialElements,
      type: type,
      multiple: multiple,
      downloadImage: downloadImage,
      clickPopup: clickPopup,
      regex: regex,
      extractAttribute: extractAttribute,
      parentSelectors: parentSelectors,
      columns: columns,
      delay: delay
    }, {
      $, document, window
    });
    return newSelector;
  },
  /**
   * @returns {Sitemap|*} Cloned Sitemap with currently edited selector
   */
  getCurrentlyEditedSelectorSitemap: function () {
    var sitemap = this.state.currentSitemap.clone();
    var selector = sitemap.getSelectorById(this.state.currentSelector.id);
    var newSelector = this.getCurrentlyEditedSelector();
    sitemap.updateSelector(selector, newSelector);
    return sitemap;
  },
  cancelSelectorEditing: function (button) {
    // cancel possible element selection
    this.contentScript.removeCurrentContentSelector().then(function () {
      this.showSitemapSelectorList();
    }.bind(this));
  },
  addSelector: function () {
    var parentSelectorId = this.state.currentParentSelectorId;
    var sitemap = this.state.currentSitemap;

    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var selector = new Selector({
      parentSelectors: [parentSelectorId],
      type: 'SelectorText',
      multiple: false
    }, { $, window, document });

    this._editSelector(selector, sitemap);
  },
  deleteSelector: function (button) {
    var sitemap = this.state.currentSitemap;
    var selector = this.$(button).closest('tr').data('selector');
    sitemap.deleteSelector(selector);

    this.store.saveSitemap(sitemap, function () {
      this.showSitemapSelectorList();
    }.bind(this));
  },
  deleteSitemap: function (button) {
    var sitemap = this.$(button).closest('tr').data('sitemap');
    var controller = this;
    this.store.deleteSitemap(sitemap, function () {
      controller.showSitemaps();
    });
  },
  initScrapeSitemapConfigValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        'requestInterval': {
          validators: {
            notEmpty: {
              message: 'The request interval is required and cannot be empty'
            },
            numeric: {
              message: 'The request interval must be numeric'
            },
            callback: {
              message: 'The request interval must be atleast 2000 milliseconds',
              callback: function (value, validator) {
                return value >= 2000;
              }
            }
          }
        },
        'pageLoadDelay': {
          validators: {
            notEmpty: {
              message: 'The page load delay is required and cannot be empty'
            },
            numeric: {
              message: 'The page laod delay must be numeric'
            },
            callback: {
              message: 'The page load delay must be atleast 500 milliseconds',
              callback: function (value, validator) {
                return value >= 500;
              }
            }
          }
        }
      }
    });
  },
  initHeadlessScrapeSitemapConfigValidation: function () {
    this.$('#viewport form').bootstrapValidator({
      fields: {
        'requestInterval': {
          validators: {
            notEmpty: {
              message: 'The request interval is required and cannot be empty'
            },
            numeric: {
              message: 'The request interval must be numeric'
            },
            callback: {
              message: 'The request interval must be atleast 2000 milliseconds',
              callback: function (value, validator) {
                return value >= 2000;
              }
            }
          }
        },
        'pageLoadDelay': {
          validators: {
            notEmpty: {
              message: 'The page load delay is required and cannot be empty'
            },
            numeric: {
              message: 'The page laod delay must be numeric'
            },
            callback: {
              message: 'The page load delay must be atleast 500 milliseconds',
              callback: function (value, validator) {
                return value >= 500;
              }
            }
          }
        }
      }
    });
  },
  showScrapeSitemapConfigPanel: function () {
    this.setActiveNavigationButton('sitemap-scrape');
    var scrapeConfigPanel = ich.SitemapScrapeConfig();
    this.$('#viewport').html(scrapeConfigPanel);
    this.initScrapeSitemapConfigValidation();
    return true;
  },
  showHeadlessScrapeSitemapConfigPanel: function () {
    this.setActiveNavigationButton('sitemap-headless-scrape');
    var scrapeConfigPanel = ich.SitemapHeadlessScrapeConfig();
    this.$('#viewport').html(scrapeConfigPanel);
    this.initHeadlessScrapeSitemapConfigValidation();
    return true;
  },
  scrapeSitemap: function () {
    if (!this.isValidForm()) {
      return false;
    }

    var requestInterval = this.$('input[name=requestInterval]').val();
    var pageLoadDelay = this.$('input[name=pageLoadDelay]').val();

    var sitemap = this.state.currentSitemap;
    var request = {
      scrapeSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap)),
      requestInterval: requestInterval,
      pageLoadDelay: pageLoadDelay
    };

    // show sitemap scraping panel
    this.getFormValidator().destroy();
    this.$('.scraping-in-progress').removeClass('hide');
    this.$('#submit-scrape-sitemap').closest('.form-group').hide();
    this.$('#scrape-sitemap-config input').prop('disabled', true);

    chrome.runtime.sendMessage(request, function (response) {
      this.browseSitemapData();
    }.bind(this));
    return false;
  },
  headlessScrapeSitemap: function () {
    if (!this.isValidForm()) {
      return false;
    }

    var requestInterval = this.$('input[name=requestInterval]').val();
    var pageLoadDelay = this.$('input[name=pageLoadDelay]').val();

    var sitemap = this.state.currentSitemap;
    var request = {
      headlessScrapeSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap)),
      requestInterval: requestInterval,
      pageLoadDelay: pageLoadDelay
    };

    // show sitemap scraping panel
    this.getFormValidator().destroy();
    this.$('.scraping-in-progress').removeClass('hide');
    this.$('#submit-scrape-sitemap').closest('.form-group').hide();
    this.$('#scrape-sitemap-config input').prop('disabled', true);

    chrome.runtime.sendMessage(request, function (response) {
      this.browseSitemapData();
    }.bind(this));
    return false;
  },
  sitemapListBrowseSitemapData: function (button) {
    var sitemap = this.$(button).closest('tr').data('sitemap');
    this.setStateEditSitemap(sitemap);
    this.browseSitemapData();
  },
  browseSitemapData: function () {
    this.setActiveNavigationButton('sitemap-browse');
    var sitemap = this.state.currentSitemap;
    this.store.getSitemapData(sitemap, function (data) {
      var dataColumns = sitemap.getDataColumns();

      var dataPanel = ich.SitemapBrowseData({
        columns: dataColumns
      });
      this.$('#viewport').html(dataPanel);

      // display data
      // Doing this the long way so there aren't xss vulnerubilites
      // while working with data or with the selector titles
      var $tbody = this.$('#sitemap-data tbody');
      var self = this;
      data.forEach(function (row) {
        var $tr = self.$('<tr></tr>');
        dataColumns.forEach(function (column) {
          var $td = self.$('<td></td>');
          var cellData = row[column];
          if (typeof cellData === 'object') {
            cellData = JSON.stringify(cellData);
          }
          $td.text(cellData);
          $tr.append($td);
        });
        $tbody.append($tr);
      });
    });

    return true;
  },

  showSitemapExportDataCsvPanel: function () {
    this.setActiveNavigationButton('sitemap-export-data-csv');

    var sitemap = this.state.currentSitemap;
    var exportPanel = ich.SitemapExportDataCSV(sitemap);
    this.$('#viewport').html(exportPanel);

    // generate data
    this.$('.download-button').hide();
    this.store.getSitemapData(sitemap, function (data) {
      var blob = sitemap.getDataExportCsvBlob(data);
      this.$('.download-button a').attr('href', window.URL.createObjectURL(blob));
      this.$('.download-button a').attr('download', sitemap._id + '.csv');
      this.$('.download-button').show();
    });

    return true;
  },

  selectSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var input = $(button).closest('.form-group').find('input.selector-value');
    var sitemap = this.getCurrentlyEditedSelectorSitemap();
    var selector = this.getCurrentlyEditedSelector();
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
    var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds);

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: selector.getItemCSSSelector()
    }, { $, document, window });

    deferredSelector.done(function (result) {
      $(input).val(result.CSSSelector);

      // update validation for selector field
      var validator = this.getFormValidator();
      validator.revalidateField(input);

      // @TODO how could this be encapsulated?
      // update header row, data row selectors after selecting the table. selectors are updated based on tables
      // inner html
      if (selector.type === 'SelectorTable') {
        this.getSelectorHTML().done(function (html) {
          var tableHeaderRowSelector = SelectorTable.getTableHeaderRowSelectorFromTableHTML(html, { $, document, window });
          var tableDataRowSelector = SelectorTable.getTableDataRowSelectorFromTableHTML(html, { $, document, window });
          $('input[name=tableHeaderRowSelector]').val(tableHeaderRowSelector);
          $('input[name=tableDataRowSelector]').val(tableDataRowSelector);

          var headerColumns = SelectorTable.getTableHeaderColumnsFromHTML(tableHeaderRowSelector, html, { $, document, window });
          this.renderTableHeaderColumns(headerColumns);
        }.bind(this));
      }
    }.bind(this));
  },

  getCurrentStateParentSelectorIds: function () {
    var parentSelectorIds = this.state.editSitemapBreadcumbsSelectors.map(function (selector) {
      return selector.id;
    });

    return parentSelectorIds;
  },

  selectTableHeaderRowSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var input = $(button).closest('.form-group').find('input.selector-value');
    var sitemap = this.getCurrentlyEditedSelectorSitemap();
    var selector = this.getCurrentlyEditedSelector();
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
    var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds);

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: 'tr'
    }, { $, document, window });

    deferredSelector.done(function (result) {
      var tableHeaderRowSelector = result.CSSSelector;
      $(input).val(tableHeaderRowSelector);

      this.getSelectorHTML().done(function (html) {
        var headerColumns = SelectorTable.getTableHeaderColumnsFromHTML(tableHeaderRowSelector, html, { $, document, window });
        this.renderTableHeaderColumns(headerColumns);
      }.bind(this));

      // update validation for selector field
      var validator = this.getFormValidator();
      validator.revalidateField(input);
    }.bind(this));
  },

  selectTableDataRowSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var input = this.$(button).closest('.form-group').find('input.selector-value');
    var sitemap = this.getCurrentlyEditedSelectorSitemap();
    var selector = this.getCurrentlyEditedSelector();
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
    var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds);

    var deferredSelector = this.contentScript.selectSelector({
      parentCSSSelector: parentCSSSelector,
      allowedElements: 'tr'
    }, { $, document, window });

    var self = this;
    deferredSelector.done(function (result) {
      if (!result) return console.error('extension/scripts/Controller.js:1259:40:new Error(\'result should not be null\')', new Error('result should not be null'));
      self.$(input).val(result.CSSSelector);

      // update validation for selector field
      var validator = this.getFormValidator();
      validator.revalidateField(input);
    }.bind(this));
  },

  /**
   * update table selector column editing fields
   */
  renderTableHeaderColumns: function (headerColumns) {
    // reset previous columns
    var $tbody = this.$('.feature-columns table tbody');
    $tbody.html('');
    headerColumns.forEach(function (column) {
      var $row = ich.SelectorEditTableColumn(column);
      $tbody.append($row);
    });
  },

  /**
   * Returns HTML that the current selector would select
   */
  getSelectorHTML: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var sitemap = this.getCurrentlyEditedSelectorSitemap();
    var selector = this.getCurrentlyEditedSelector();
    var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
    var CSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds);
    var deferredHTML = this.contentScript.getHTML({ CSSSelector: CSSSelector }, { $, document, window });

    return deferredHTML;
  },
  previewSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (!$(button).hasClass('preview')) {
      var sitemap = this.getCurrentlyEditedSelectorSitemap();
      var selector = this.getCurrentlyEditedSelector();
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds);
      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.selector
      }, { $, document, window });

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview');
      });
    } else {
      this.contentScript.removeCurrentContentSelector();
      $(button).removeClass('preview');
    }
  },
  previewClickElementSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (!$(button).hasClass('preview')) {
      var sitemap = this.state.currentSitemap;
      var selector = this.getCurrentlyEditedSelector();
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds);

      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.clickElementSelector
      }, { $, document, window });

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview');
      });
    } else {
      this.contentScript.removeCurrentContentSelector();
      $(button).removeClass('preview');
    }
  },
  previewTableRowSelector: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (!$(button).hasClass('preview')) {
      var sitemap = this.getCurrentlyEditedSelectorSitemap();
      var selector = this.getCurrentlyEditedSelector();
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
      var parentCSSSelector = sitemap.selectors.getCSSSelectorWithinOnePage(selector.id, currentStateParentSelectorIds);
      var rowSelector = $(button).closest('.form-group').find('input').val();

      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: rowSelector
      }, { $, document, window });

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview');
      });
    } else {
      this.contentScript.removeCurrentContentSelector();
      $(button).removeClass('preview');
    }
  },
  previewSelectorFromSelectorTree: function (button) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    if (!$(button).hasClass('preview')) {
      var sitemap = this.state.currentSitemap;
      var selector = $(button).closest('tr').data('selector');
      var currentStateParentSelectorIds = this.getCurrentStateParentSelectorIds();
      var parentCSSSelector = sitemap.selectors.getParentCSSSelectorWithinOnePage(currentStateParentSelectorIds);
      var deferredSelectorPreview = this.contentScript.previewSelector({
        parentCSSSelector: parentCSSSelector,
        elementCSSSelector: selector.selector
      }, { $, document, window });

      deferredSelectorPreview.done(function () {
        $(button).addClass('preview');
      });
    } else {
      this.contentScript.removeCurrentContentSelector();
      $(button).removeClass('preview');
    }
  },
  previewSelectorDataFromSelectorTree: function (button) {
    var self = this;
    var sitemap = this.state.currentSitemap;
    var selector = self.$(button).closest('tr').data('selector');
    this.previewSelectorData(sitemap, selector.id);
  },
  previewSelectorDataFromSelectorEditing: function () {
    var sitemap = this.state.currentSitemap.clone();
    var selector = sitemap.getSelectorById(this.state.currentSelector.id);
    var newSelector = this.getCurrentlyEditedSelector();
    sitemap.updateSelector(selector, newSelector);
    this.previewSelectorData(sitemap, newSelector.id);
  },
  /**
   * Returns a list of selector ids that the user has opened
   * @returns {Array}
   */
  getStateParentSelectorIds: function () {
    var parentSelectorIds = [];
    this.state.editSitemapBreadcumbsSelectors.forEach(function (selector) {
      parentSelectorIds.push(selector.id);
    });
    return parentSelectorIds;
  },
  previewSelectorData: function (sitemap, selectorId) {
    // data preview will be base on how the selector tree is opened
    var parentSelectorIds = this.getStateParentSelectorIds();

    var self = this;

    var request = {
      previewSelectorData: true,
      sitemap: JSON.parse(JSON.stringify(sitemap)),
      parentSelectorIds: parentSelectorIds,
      selectorId: selectorId
    };
    chrome.runtime.sendMessage(request, function (response) {
      if (response.length === 0) {
        return;
      }
      var dataColumns = Object.keys(response[0]);

      console.log('extension/scripts/Controller.js:1429:18:dataColumns', dataColumns);

      var $dataPreviewPanel = ich.DataPreview({
        columns: dataColumns
      });
      self.$('#viewport').append($dataPreviewPanel);
      $dataPreviewPanel.modal('show');
      // display data
      // Doing this the long way so there aren't xss vulnerubilites
      // while working with data or with the selector titles
      var $tbody = self.$('tbody', $dataPreviewPanel);
      response.forEach(function (row) {
        var $tr = self.$('<tr></tr>');
        dataColumns.forEach(function (column) {
          var $td = self.$('<td></td>');
          var cellData = row[column];
          if (typeof cellData === 'object') {
            cellData = JSON.stringify(cellData);
          }
          $td.text(cellData);
          $tr.append($td);
        });
        $tbody.append($tr);
      });

      var windowHeight = self.$(window).height();

      self.$('.data-preview-modal .modal-body').height(windowHeight - 130);

      // remove modal from dom after it is closed
      $dataPreviewPanel.on('hidden.bs.modal', function () {
        self.$(this).remove();
      });
    });
  },
  /**
   * Add start url to sitemap creation or editing form
   * @param button
   */
  addStartUrl: function (button) {
    var self = this;
    var $startUrlInputField = ich.SitemapStartUrlField();
    self.$('#viewport .start-url-block:last').after($startUrlInputField);
    var validator = this.getFormValidator();
    validator.addField($startUrlInputField.find('input'));
  },
  /**
   * Remove start url from sitemap creation or editing form.
   * @param button
   */
  removeStartUrl: function (button) {
    var self = this;
    var $block = self.$(button).closest('.start-url-block');
    if (self.$('#viewport .start-url-block').length > 1) {
      // remove from validator
      var validator = this.getFormValidator();
      validator.removeField($block.find('input'));

      $block.remove();
    }
  }
};

module.exports = SitemapController;

},{"./Selector":9,"./Selectors":22,"./Sitemap":23,"./getBackgroundScript":26,"./getContentScript":27}],8:[function(require,module,exports){
/**
 * Element selector. Uses jQuery as base and adds some more features
 * @param CSSSelector
 * @param parentElement
 * @param options
 */
var ElementQuery = function (CSSSelector, parentElement, options) {
  CSSSelector = CSSSelector || '';
  this.$ = options.$;
  this.document = options.document;
  this.window = options.window;
  if (!this.$) throw new Error('Missing jquery for ElementQuery');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");
  var selectedElements = [];

  var addElement = function (element) {
    if (selectedElements.indexOf(element) === -1) {
      selectedElements.push(element);
    }
  };

  var selectorParts = ElementQuery.getSelectorParts(CSSSelector);
  var self = this;
  selectorParts.forEach(function (selector) {
    // handle special case when parent is selected
    if (selector === '_parent_') {
      self.$(parentElement).each(function (i, element) {
        addElement(element);
      });
    } else {
      var elements = self.$(selector, self.$(parentElement));
      elements.each(function (i, element) {
        addElement(element);
      });
    }
  });

  return selectedElements;
};

ElementQuery.getSelectorParts = function (CSSSelector) {
  var selectors = CSSSelector.split(/(,|".*?"|'.*?'|\(.*?\))/);

  var resultSelectors = [];
  var currentSelector = '';
  selectors.forEach(function (selector) {
    if (selector === ',') {
      if (currentSelector.trim().length) {
        resultSelectors.push(currentSelector.trim());
      }
      currentSelector = '';
    } else {
      currentSelector += selector;
    }
  });
  if (currentSelector.trim().length) {
    resultSelectors.push(currentSelector.trim());
  }

  return resultSelectors;
};

module.exports = ElementQuery;

},{}],9:[function(require,module,exports){
var selectors = require('./Selectors');
var ElementQuery = require('./ElementQuery');
var jquery = require('jquery-deferred');

var Selector = function (selector, options) {
  var $ = options.$;
  var document = options.document;
  var window = options.window;
  // We don't want enumerable properties
  Object.defineProperty(this, '$', {
    value: $,
    enumerable: false
  });
  Object.defineProperty(this, 'window', {
    value: window,
    enumerable: false
  });
  Object.defineProperty(this, 'document', {
    value: document,
    enumerable: false
  });
  if (!this.$) throw new Error('Missing jquery');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");

  this.updateData(selector);
  this.initType();
};

Selector.prototype = {

  /**
   * Is this selector configured to return multiple items?
   * @returns {boolean}
   */
  willReturnMultipleRecords: function () {
    return this.canReturnMultipleRecords() && this.multiple;
  },

  /**
   * Update current selector configuration
   * @param data
   */
  updateData: function (data) {
    var allowedKeys = ['window', 'document', 'id', 'type', 'selector', 'parentSelectors'];
    console.log('extension/scripts/Selector.js:46:16:\'data type\',data.type', 'data type', data.type);
    allowedKeys = allowedKeys.concat(selectors[data.type].getFeatures());
    var key;
    // update data
    for (key in data) {
      if (allowedKeys.indexOf(key) !== -1 || typeof data[key] === 'function') {
        this[key] = data[key];
      }
    }

    // remove values that are not needed for this type of selector
    for (key in this) {
      if (allowedKeys.indexOf(key) === -1 && typeof this[key] !== 'function') {
        delete this[key];
      }
    }
  },

  /**
   * CSS selector which will be used for element selection
   * @returns {string}
   */
  getItemCSSSelector: function () {
    return '*';
  },

  /**
   * override objects methods based on seletor type
   */
  initType: function () {
    if (selectors[this.type] === undefined) {
      throw new Error('Selector type not defined ' + this.type);
    }

    // overrides objects methods
    for (var i in selectors[this.type]) {
      this[i] = selectors[this.type][i];
    }
  },

  /**
   * Check whether a selector is a paren selector of this selector
   * @param selectorId
   * @returns {boolean}
   */
  hasParentSelector: function (selectorId) {
    return this.parentSelectors.indexOf(selectorId) !== -1;
  },

  removeParentSelector: function (selectorId) {
    var index = this.parentSelectors.indexOf(selectorId);
    if (index !== -1) {
      this.parentSelectors.splice(index, 1);
    }
  },

  renameParentSelector: function (originalId, replacementId) {
    if (this.hasParentSelector(originalId)) {
      var pos = this.parentSelectors.indexOf(originalId);
      this.parentSelectors.splice(pos, 1, replacementId);
    }
  },

  getDataElements: function (parentElement) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var elements = ElementQuery(this.selector, parentElement, { $, document, window });
    if (this.multiple) {
      return elements;
    } else if (elements.length > 0) {
      return [elements[0]];
    } else {
      return [];
    }
  },

  getData: function (parentElement) {
    var d = jquery.Deferred();
    var timeout = this.delay || 0;

    // this works much faster because whenCallSequentally isn't running next data extraction immediately
    if (timeout === 0) {
      var deferredData = this._getData(parentElement);
      deferredData.done(function (data) {
        d.resolve(data);
      });
    } else {
      setTimeout(function () {
        var deferredData = this._getData(parentElement);
        deferredData.done(function (data) {
          d.resolve(data);
        });
      }.bind(this), timeout);
    }

    return d.promise();
  }
};

module.exports = Selector;

},{"./ElementQuery":8,"./Selectors":22,"jquery-deferred":29}],10:[function(require,module,exports){
var jquery = require('jquery-deferred');

var SelectorElement = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return true;
  },

  canHaveLocalChildSelectors: function () {
    return true;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return true;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();

    var elements = this.getDataElements(parentElement);
    dfd.resolve(this.$.makeArray(elements));

    return dfd.promise();
  },

  getDataColumns: function () {
    return [];
  },

  getFeatures: function () {
    return ['multiple', 'delay'];
  }
};

module.exports = SelectorElement;

},{"jquery-deferred":29}],11:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorElementAttribute = {
  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();
    var self = this;
    var elements = this.getDataElements(parentElement);

    var result = [];
    self.$(elements).each(function (k, element) {
      var data = {};

      data[this.id] = self.$(element).attr(this.extractAttribute);
      result.push(data);
    }.bind(this));

    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id + '-src'] = null;
      result.push(data);
    }
    dfd.resolve(result);

    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id];
  },

  getFeatures: function () {
    return ['multiple', 'extractAttribute', 'delay'];
  }
};

module.exports = SelectorElementAttribute;

},{"jquery-deferred":29}],12:[function(require,module,exports){
var jquery = require('jquery-deferred');
var UniqueElementList = require('./../UniqueElementList');
var ElementQuery = require('./../ElementQuery');
var CssSelector = require('css-selector').CssSelector;
var SelectorElementClick = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return true;
  },

  canHaveLocalChildSelectors: function () {
    return true;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return true;
  },

  getClickElements: function (parentElement) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var clickElements = ElementQuery(this.clickElementSelector, parentElement, { $, document, window });
    return clickElements;
  },

  /**
   * Check whether element is still reachable from html. Useful to check whether the element is removed from DOM.
   * @param element
   */
  isElementInHTML: function (element) {
    return this.$(element).closest('html').length !== 0;
  },

  triggerButtonClick: function (clickElement) {
    var document = this.document;
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: this.$('body')[0],
      enableResultStripping: false
    });
    var cssSelector = cs.getCssSelector([clickElement]);

    document.querySelectorAll(cssSelector)[0].click();
    /*    // this function will catch window.open call and place the requested url as the elements data attribute
        var script = document.createElement('script')
        script.type = 'text/javascript'
        script.text = '' +
    			'(function(){ ' +
    			"var el = document.querySelectorAll('" + cssSelector + "')[0]; " +
    			'el.click(); ' +
    			'})();'
        document.body.appendChild(script)*/
  },

  getClickElementUniquenessType: function () {
    if (this.clickElementUniquenessType === undefined) {
      return 'uniqueText';
    } else {
      return this.clickElementUniquenessType;
    }
  },

  _getData: function (parentElement) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var delay = parseInt(this.delay) || 0;
    var deferredResponse = jquery.Deferred();
    var foundElements = new UniqueElementList('uniqueText', { $, document, window });
    var clickElements = this.getClickElements(parentElement);
    var doneClickingElements = new UniqueElementList(this.getClickElementUniquenessType(), { $, document, window });

    // add elements that are available before clicking
    var elements = this.getDataElements(parentElement);
    elements.forEach(foundElements.push.bind(foundElements));

    // discard initial elements
    if (this.discardInitialElements) {
      foundElements = new UniqueElementList('uniqueText', { $, document, window });
    }

    // no elements to click at the beginning
    if (clickElements.length === 0) {
      deferredResponse.resolve(foundElements);
      return deferredResponse.promise();
    }

    // initial click and wait
    var currentClickElement = clickElements[0];
    this.triggerButtonClick(currentClickElement);
    var nextElementSelection = new Date().getTime() + delay;

    // infinitely scroll down and find all items
    var interval = setInterval(function () {
      // find those click elements that are not in the black list
      var allClickElements = this.getClickElements(parentElement);
      clickElements = [];
      allClickElements.forEach(function (element) {
        if (!doneClickingElements.isAdded(element)) {
          clickElements.push(element);
        }
      });

      var now = new Date().getTime();
      // sleep. wait when to extract next elements
      if (now < nextElementSelection) {
        // console.log("wait");
        return;
      }

      // add newly found elements to element foundElements array.
      var elements = this.getDataElements(parentElement);
      var addedAnElement = false;
      elements.forEach(function (element) {
        var added = foundElements.push(element);
        if (added) {
          addedAnElement = true;
        }
      });
      // console.log("added", addedAnElement);

      // no new elements found. Stop clicking this button
      if (!addedAnElement) {
        doneClickingElements.push(currentClickElement);
      }

      // continue clicking and add delay, but if there is nothing
      // more to click the finish
      // console.log("total buttons", clickElements.length)
      if (clickElements.length === 0) {
        clearInterval(interval);
        deferredResponse.resolve(foundElements);
      } else {
        // console.log("click");
        currentClickElement = clickElements[0];
        // click on elements only once if the type is clickonce
        if (this.clickType === 'clickOnce') {
          doneClickingElements.push(currentClickElement);
        }
        this.triggerButtonClick(currentClickElement);
        nextElementSelection = now + delay;
      }
    }.bind(this), 50);

    return deferredResponse.promise();
  },

  getDataColumns: function () {
    return [];
  },

  getFeatures: function () {
    return ['multiple', 'delay', 'clickElementSelector', 'clickType', 'discardInitialElements', 'clickElementUniquenessType'];
  }
};

module.exports = SelectorElementClick;

},{"./../ElementQuery":8,"./../UniqueElementList":25,"css-selector":28,"jquery-deferred":29}],13:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorElementScroll = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return true;
  },

  canHaveLocalChildSelectors: function () {
    return true;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return true;
  },
  scrollToBottom: function () {
    var document = this.document;
    window.scrollTo(0, document.body.scrollHeight);
  },
  _getData: function (parentElement) {
    var delay = parseInt(this.delay) || 0;
    var deferredResponse = jquery.Deferred();
    var foundElements = [];

    // initially scroll down and wait
    this.scrollToBottom();
    var nextElementSelection = new Date().getTime() + delay;

    // infinitely scroll down and find all items
    var interval = setInterval(function () {
      var now = new Date().getTime();
      // sleep. wait when to extract next elements
      if (now < nextElementSelection) {
        return;
      }

      var elements = this.getDataElements(parentElement);
      // no new elements found
      if (elements.length === foundElements.length) {
        clearInterval(interval);
        deferredResponse.resolve(this.$.makeArray(elements));
      } else {
        // continue scrolling and add delay
        foundElements = elements;
        this.scrollToBottom();
        nextElementSelection = now + delay;
      }
    }.bind(this), 50);

    return deferredResponse.promise();
  },

  getDataColumns: function () {
    return [];
  },

  getFeatures: function () {
    return ['multiple', 'delay'];
  }
};

module.exports = SelectorElementScroll;

},{"jquery-deferred":29}],14:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorGroup = {

  canReturnMultipleRecords: function () {
    return false;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();
    var self = this;
    // cannot reuse this.getDataElements because it depends on *multiple* property
    var elements = self.$(this.selector, parentElement);

    var records = [];
    self.$(elements).each(function (k, element) {
      var data = {};

      data[this.id] = self.$(element).text();

      if (this.extractAttribute) {
        data[this.id + '-' + this.extractAttribute] = self.$(element).attr(this.extractAttribute);
      }

      records.push(data);
    }.bind(this));

    var result = {};
    result[this.id] = records;

    dfd.resolve([result]);
    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id];
  },

  getFeatures: function () {
    return ['delay', 'extractAttribute'];
  }
};

module.exports = SelectorGroup;

},{"jquery-deferred":29}],15:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorHTML = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();
    var self = this;
    var elements = this.getDataElements(parentElement);

    var result = [];
    self.$(elements).each(function (k, element) {
      var data = {};
      var html = self.$(element).html();

      if (this.regex !== undefined && this.regex.length) {
        var matches = html.match(new RegExp(this.regex));
        if (matches !== null) {
          html = matches[0];
        } else {
          html = null;
        }
      }
      data[this.id] = html;

      result.push(data);
    }.bind(this));

    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id] = null;
      result.push(data);
    }

    dfd.resolve(result);
    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id];
  },

  getFeatures: function () {
    return ['multiple', 'regex', 'delay'];
  }
};

module.exports = SelectorHTML;

},{"jquery-deferred":29}],16:[function(require,module,exports){
var jquery = require('jquery-deferred');
var whenCallSequentially = require('../../assets/jquery.whencallsequentially');
var Base64 = require('../../assets/base64');
var SelectorImage = {
  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();

    var elements = this.getDataElements(parentElement);

    var deferredDataCalls = [];
    this.$(elements).each(function (i, element) {
      deferredDataCalls.push(function () {
        var deferredData = jquery.Deferred();

        var data = {};
        data[this.id + '-src'] = element.src;

        // download image if required
        if (!this.downloadImage) {
          deferredData.resolve(data);
        } else {
          var deferredImageBase64 = this.downloadImageBase64(element.src);

          deferredImageBase64.done(function (imageResponse) {
            data['_imageBase64-' + this.id] = imageResponse.imageBase64;
            data['_imageMimeType-' + this.id] = imageResponse.mimeType;

            deferredData.resolve(data);
          }.bind(this)).fail(function () {
            // failed to download image continue.
            // @TODO handle errror
            deferredData.resolve(data);
          });
        }

        return deferredData.promise();
      }.bind(this));
    }.bind(this));

    whenCallSequentially(deferredDataCalls).done(function (dataResults) {
      if (this.multiple === false && elements.length === 0) {
        var data = {};
        data[this.id + '-src'] = null;
        dataResults.push(data);
      }

      dfd.resolve(dataResults);
    });

    return dfd.promise();
  },

  downloadFileAsBlob: function (url) {
    var window = this.window;
    var deferredResponse = jquery.Deferred();
    var xhr = new window.XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status == 200) {
          var blob = this.response;
          deferredResponse.resolve(blob);
        } else {
          deferredResponse.reject(xhr.statusText);
        }
      }
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();

    return deferredResponse.promise();
  },

  downloadImageBase64: function (url) {
    var deferredResponse = jquery.Deferred();
    var deferredDownload = this.downloadFileAsBlob(url);
    deferredDownload.done(function (blob) {
      var mimeType = blob.type;
      var deferredBlob = Base64.blobToBase64(blob);
      deferredBlob.done(function (imageBase64) {
        deferredResponse.resolve({
          mimeType: mimeType,
          imageBase64: imageBase64
        });
      });
    }).fail(deferredResponse.fail);
    return deferredResponse.promise();
  },

  getDataColumns: function () {
    return [this.id + '-src'];
  },

  getFeatures: function () {
    return ['multiple', 'delay', 'downloadImage'];
  },

  getItemCSSSelector: function () {
    return 'img';
  }
};

module.exports = SelectorImage;

},{"../../assets/base64":1,"../../assets/jquery.whencallsequentially":2,"jquery-deferred":29}],17:[function(require,module,exports){
var jquery = require('jquery-deferred');
var whenCallSequentially = require('../../assets/jquery.whencallsequentially');

var SelectorLink = {
  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return true;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return true;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var elements = this.getDataElements(parentElement);
    var self = this;

    var dfd = jquery.Deferred();

    // return empty record if not multiple type and no elements found
    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id] = null;
      dfd.resolve([data]);
      return dfd;
    }

    // extract links one by one
    var deferredDataExtractionCalls = [];
    self.$(elements).each(function (k, element) {
      deferredDataExtractionCalls.push(function (element) {
        var deferredData = jquery.Deferred();

        var data = {};
        data[this.id] = self.$(element).text();
        data._followSelectorId = this.id;
        data[this.id + '-href'] = element.href;
        data._follow = element.href;
        deferredData.resolve(data);

        return deferredData;
      }.bind(this, element));
    }.bind(this));

    whenCallSequentially(deferredDataExtractionCalls).done(function (responses) {
      var result = [];
      responses.forEach(function (dataResult) {
        result.push(dataResult);
      });
      dfd.resolve(result);
    });

    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id, this.id + '-href'];
  },

  getFeatures: function () {
    return ['multiple', 'delay'];
  },

  getItemCSSSelector: function () {
    return 'a';
  }
};

module.exports = SelectorLink;

},{"../../assets/jquery.whencallsequentially":2,"jquery-deferred":29}],18:[function(require,module,exports){
var whenCallSequentially = require('../../assets/jquery.whencallsequentially');
var jquery = require('jquery-deferred');
var CssSelector = require('css-selector').CssSelector;
var SelectorPopupLink = {
  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return true;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return true;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var elements = this.getDataElements(parentElement);

    var dfd = jquery.Deferred();

    // return empty record if not multiple type and no elements found
    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id] = null;
      dfd.resolve([data]);
      return dfd;
    }

    // extract links one by one
    var deferredDataExtractionCalls = [];
    $(elements).each(function (k, element) {
      deferredDataExtractionCalls.push(function (element) {
        var deferredData = jquery.Deferred();

        var data = {};
        data[this.id] = $(element).text();
        data._followSelectorId = this.id;

        var deferredPopupURL = this.getPopupURL(element);
        deferredPopupURL.done(function (url) {
          data[this.id + '-href'] = url;
          data._follow = url;
          deferredData.resolve(data);
        }.bind(this));

        return deferredData;
      }.bind(this, element));
    }.bind(this));

    whenCallSequentially(deferredDataExtractionCalls).done(function (responses) {
      var result = [];
      responses.forEach(function (dataResult) {
        result.push(dataResult);
      });
      dfd.resolve(result);
    });

    return dfd.promise();
  },

  /**
   * Gets an url from a window.open call by mocking the window.open function
   * @param element
   * @returns $.Deferred()
   */
  getPopupURL: function (element) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    // override window.open function. we need to execute this in page scope.
    // we need to know how to find this element from page scope.
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: document.body,
      enableResultStripping: false
    });
    var cssSelector = cs.getCssSelector([element]);
    console.log('extension/scripts/Selector/SelectorPopupLink.js:88:16:cssSelector', cssSelector);
    console.log('extension/scripts/Selector/SelectorPopupLink.js:89:16:document.body.querySelectorAll(cssSelector)', document.body.querySelectorAll(cssSelector));
    // this function will catch window.open call and place the requested url as the elements data attribute
    var script = document.createElement('script');
    script.type = 'text/javascript';
    console.log('extension/scripts/Selector/SelectorPopupLink.js:93:16:cssSelector', cssSelector);
    console.log('extension/scripts/Selector/SelectorPopupLink.js:94:16:document.querySelectorAll(cssSelector)', document.querySelectorAll(cssSelector));
    var el = document.querySelectorAll(cssSelector)[0];

    const open = window.open;
    window.open = function () {
      var url = arguments[0];
      el.dataset.webScraperExtractUrl = url;
      window.open = open;
    };
    el.click();

    // wait for url to be available
    var deferredURL = jquery.Deferred();
    var timeout = Math.abs(5000 / 30); // 5s timeout to generate an url for popup
    var interval = setInterval(function () {
      var url = $(element).data('web-scraper-extract-url');
      if (url) {
        deferredURL.resolve(url);
        clearInterval(interval);
        script.remove();
      }
      // timeout popup opening
      if (timeout-- <= 0) {
        clearInterval(interval);
        script.remove();
      }
    }, 30);

    return deferredURL.promise();
  },

  getDataColumns: function () {
    return [this.id, this.id + '-href'];
  },

  getFeatures: function () {
    return ['multiple', 'delay'];
  },

  getItemCSSSelector: function () {
    return '*';
  }
};

module.exports = SelectorPopupLink;

},{"../../assets/jquery.whencallsequentially":2,"css-selector":28,"jquery-deferred":29}],19:[function(require,module,exports){
var jquery = require('jquery-deferred');

var SelectorTable = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  getTableHeaderColumns: function ($table) {
    var columns = {};
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var headerRowSelector = this.getTableHeaderRowSelector();
    var $headerRow = $($table).find(headerRowSelector);
    if ($headerRow.length > 0) {
      $headerRow.find('td,th').each(function (i) {
        var header = $(this).text().trim();
        columns[header] = {
          index: i + 1
        };
      });
    }
    return columns;
  },
  _getData: function (parentElement) {
    var dfd = jquery.Deferred();
    var $ = this.$;
    var document = this.document;
    var window = this.window;

    var tables = this.getDataElements(parentElement);

    var result = [];
    $(tables).each(function (k, table) {
      var columns = this.getTableHeaderColumns($(table));

      var dataRowSelector = this.getTableDataRowSelector();
      $(table).find(dataRowSelector).each(function (i, row) {
        var data = {};
        this.columns.forEach(function (column) {
          if (column.extract === true) {
            if (columns[column.header] === undefined) {
              data[column.name] = null;
            } else {
              var rowText = $(row).find('>:nth-child(' + columns[column.header].index + ')').text().trim();
              data[column.name] = rowText;
            }
          }
        });
        result.push(data);
      }.bind(this));
    }.bind(this));

    dfd.resolve(result);
    return dfd.promise();
  },

  getDataColumns: function () {
    var dataColumns = [];
    this.columns.forEach(function (column) {
      if (column.extract === true) {
        dataColumns.push(column.name);
      }
    });
    return dataColumns;
  },

  getFeatures: function () {
    return ['multiple', 'columns', 'delay', 'tableDataRowSelector', 'tableHeaderRowSelector'];
  },

  getItemCSSSelector: function () {
    return 'table';
  },

  getTableHeaderRowSelectorFromTableHTML: function (html, options = {}) {
    var $ = options.$ || this.$;
    var $table = $(html);
    if ($table.find('thead tr:has(td:not(:empty)), thead tr:has(th:not(:empty))').length) {
      if ($table.find('thead tr').length === 1) {
        return 'thead tr';
      } else {
        var $rows = $table.find('thead tr');
        // first row with data
        var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0]);
        return 'thead tr:nth-of-type(' + (rowIndex + 1) + ')';
      }
    } else if ($table.find('tr td:not(:empty), tr th:not(:empty)').length) {
      var $rows = $table.find('tr');
      // first row with data
      var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0]);
      return 'tr:nth-of-type(' + (rowIndex + 1) + ')';
    } else {
      return '';
    }
  },

  getTableDataRowSelectorFromTableHTML: function (html, options = {}) {
    var $ = options.$ || this.$;
    var $table = $(html);
    if ($table.find('thead tr:has(td:not(:empty)), thead tr:has(th:not(:empty))').length) {
      return 'tbody tr';
    } else if ($table.find('tr td:not(:empty), tr th:not(:empty)').length) {
      var $rows = $table.find('tr');
      // first row with data
      var rowIndex = $rows.index($rows.filter(':has(td:not(:empty)),:has(th:not(:empty))')[0]);
      return 'tr:nth-of-type(n+' + (rowIndex + 2) + ')';
    } else {
      return '';
    }
  },

  getTableHeaderRowSelector: function () {
    // handle legacy selectors
    if (this.tableHeaderRowSelector === undefined) {
      return 'thead tr';
    } else {
      return this.tableHeaderRowSelector;
    }
  },

  getTableDataRowSelector: function () {
    // handle legacy selectors
    if (this.tableDataRowSelector === undefined) {
      return 'tbody tr';
    } else {
      return this.tableDataRowSelector;
    }
  },

  /**
   * Extract table header column info from html
   * @param html
   */
  getTableHeaderColumnsFromHTML: function (headerRowSelector, html, options = {}) {
    var $ = options.$ || this.$;
    var $table = $(html);
    var $headerRowColumns = $table.find(headerRowSelector).find('td,th');

    var columns = [];

    $headerRowColumns.each(function (i, columnEl) {
      var header = $(columnEl).text().trim();
      var name = header;
      if (header.length !== 0) {
        columns.push({
          header: header,
          name: name,
          extract: true
        });
      }
    });
    return columns;
  }
};

module.exports = SelectorTable;

},{"jquery-deferred":29}],20:[function(require,module,exports){
var jquery = require('jquery-deferred');
var SelectorText = {

  canReturnMultipleRecords: function () {
    return true;
  },

  canHaveChildSelectors: function () {
    return false;
  },

  canHaveLocalChildSelectors: function () {
    return false;
  },

  canCreateNewJobs: function () {
    return false;
  },
  willReturnElements: function () {
    return false;
  },
  _getData: function (parentElement) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var dfd = jquery.Deferred();

    var elements = this.getDataElements(parentElement);

    var result = [];
    $(elements).each(function (k, element) {
      var data = {};

      // remove script, style tag contents from text results
      var $element_clone = $(element).clone();
      $element_clone.find('script, style').remove();
      // <br> replace br tags with newlines
      $element_clone.find('br').after('\n');

      var text = $element_clone.text();
      if (this.regex !== undefined && this.regex.length) {
        var matches = text.match(new RegExp(this.regex));
        if (matches !== null) {
          text = matches[0];
        } else {
          text = null;
        }
      }
      data[this.id] = text;

      result.push(data);
    }.bind(this));

    if (this.multiple === false && elements.length === 0) {
      var data = {};
      data[this.id] = null;
      result.push(data);
    }

    dfd.resolve(result);
    return dfd.promise();
  },

  getDataColumns: function () {
    return [this.id];
  },

  getFeatures: function () {
    return ['multiple', 'regex', 'delay'];
  }
};

module.exports = SelectorText;

},{"jquery-deferred":29}],21:[function(require,module,exports){
var Selector = require('./Selector');

var SelectorList = function (selectors, options) {
  var $ = options.$;
  var document = options.document;
  var window = options.window;
  // We don't want enumerable properties
  Object.defineProperty(this, '$', {
    value: $,
    enumerable: false
  });
  Object.defineProperty(this, 'window', {
    value: window,
    enumerable: false
  });
  Object.defineProperty(this, 'document', {
    value: document,
    enumerable: false
  });
  if (!this.$) throw new Error('Missing jquery');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");

  if (selectors === null || selectors === undefined) {
    return;
  }

  for (var i = 0; i < selectors.length; i++) {
    this.push(selectors[i]);
  }
};

SelectorList.prototype = [];

SelectorList.prototype.push = function (selector) {
  if (!this.hasSelector(selector.id)) {
    if (!(selector instanceof Selector)) {
      var $ = this.$;
      var document = this.document;
      var window = this.window;
      selector = new Selector(selector, { $, window, document });
    }
    Array.prototype.push.call(this, selector);
  }
};

SelectorList.prototype.hasSelector = function (selectorId) {
  if (selectorId instanceof Object) {
    selectorId = selectorId.id;
  }

  for (var i = 0; i < this.length; i++) {
    if (this[i].id === selectorId) {
      return true;
    }
  }
  return false;
};

/**
 * Returns all selectors or recursively find and return all child selectors of a parent selector.
 * @param parentSelectorId
 * @returns {Array}
 */
SelectorList.prototype.getAllSelectors = function (parentSelectorId) {
  if (parentSelectorId === undefined) {
    return this;
  }

  var getAllChildSelectors = function (parentSelectorId, resultSelectors) {
    this.forEach(function (selector) {
      if (selector.hasParentSelector(parentSelectorId)) {
        if (resultSelectors.indexOf(selector) === -1) {
          resultSelectors.push(selector);
          getAllChildSelectors(selector.id, resultSelectors);
        }
      }
    });
  }.bind(this);

  var resultSelectors = [];
  getAllChildSelectors(parentSelectorId, resultSelectors);
  return resultSelectors;
};

/**
 * Returns only selectors that are directly under a parent
 * @param parentSelectorId
 * @returns {Array}
 */
SelectorList.prototype.getDirectChildSelectors = function (parentSelectorId) {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultSelectors = new SelectorList(null, { $, window, document });
  this.forEach(function (selector) {
    if (selector.hasParentSelector(parentSelectorId)) {
      resultSelectors.push(selector);
    }
  });
  return resultSelectors;
};

SelectorList.prototype.clone = function () {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultList = new SelectorList(null, { $, window, document });
  this.forEach(function (selector) {
    resultList.push(selector);
  });
  return resultList;
};

SelectorList.prototype.fullClone = function () {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultList = new SelectorList(null, { $, window, document });
  this.forEach(function (selector) {
    resultList.push(JSON.parse(JSON.stringify(selector)));
  });
  return resultList;
};

SelectorList.prototype.concat = function () {
  var resultList = this.clone();
  for (var i in arguments) {
    arguments[i].forEach(function (selector) {
      resultList.push(selector);
    });
  }
  return resultList;
};

SelectorList.prototype.getSelector = function (selectorId) {
  for (var i = 0; i < this.length; i++) {
    var selector = this[i];
    if (selector.id === selectorId) {
      return selector;
    }
  }
};

/**
 * Returns all selectors if this selectors including all parent selectors within this page
 * @TODO not used any more.
 * @param selectorId
 * @returns {*}
 */
SelectorList.prototype.getOnePageSelectors = function (selectorId) {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultList = new SelectorList(null, { $, window, document });
  var selector = this.getSelector(selectorId);
  resultList.push(this.getSelector(selectorId));

  // recursively find all parent selectors that could lead to the page where selectorId is used.
  var findParentSelectors = function (selector) {
    selector.parentSelectors.forEach(function (parentSelectorId) {
      if (parentSelectorId === '_root') return;
      var parentSelector = this.getSelector(parentSelectorId);
      if (resultList.indexOf(parentSelector) !== -1) return;
      if (parentSelector.willReturnElements()) {
        resultList.push(parentSelector);
        findParentSelectors(parentSelector);
      }
    }.bind(this));
  }.bind(this);

  findParentSelectors(selector);

  // add all child selectors
  resultList = resultList.concat(this.getSinglePageAllChildSelectors(selector.id));
  return resultList;
};

/**
 * Returns all child selectors of a selector which can be used within one page.
 * @param parentSelectorId
 */
SelectorList.prototype.getSinglePageAllChildSelectors = function (parentSelectorId) {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  var resultList = new SelectorList(null, { $, window, document });
  var addChildSelectors = function (parentSelector) {
    if (parentSelector.willReturnElements()) {
      var childSelectors = this.getDirectChildSelectors(parentSelector.id);
      childSelectors.forEach(function (childSelector) {
        if (resultList.indexOf(childSelector) === -1) {
          resultList.push(childSelector);
          addChildSelectors(childSelector);
        }
      });
    }
  }.bind(this);

  var parentSelector = this.getSelector(parentSelectorId);
  addChildSelectors(parentSelector);
  return resultList;
};

SelectorList.prototype.willReturnMultipleRecords = function (selectorId) {
  // handle reuqested selector
  var selector = this.getSelector(selectorId);
  if (selector.willReturnMultipleRecords() === true) {
    return true;
  }

  // handle all its child selectors
  var childSelectors = this.getAllSelectors(selectorId);
  for (var i = 0; i < childSelectors.length; i++) {
    var selector = childSelectors[i];
    if (selector.willReturnMultipleRecords() === true) {
      return true;
    }
  }

  return false;
};

/**
 * When serializing to JSON convert to an array
 * @returns {Array}
 */
SelectorList.prototype.toJSON = function () {
  var result = [];
  this.forEach(function (selector) {
    result.push(selector);
  });
  return result;
};

SelectorList.prototype.getSelectorById = function (selectorId) {
  for (var i = 0; i < this.length; i++) {
    var selector = this[i];
    if (selector.id === selectorId) {
      return selector;
    }
  }
};

/**
 * returns css selector for a given element. css selector includes all parent element selectors
 * @param selectorId
 * @param parentSelectorIds array of parent selector ids from devtools Breadcumb
 * @returns string
 */
SelectorList.prototype.getCSSSelectorWithinOnePage = function (selectorId, parentSelectorIds) {
  var CSSSelector = this.getSelector(selectorId).selector;
  var parentCSSSelector = this.getParentCSSSelectorWithinOnePage(parentSelectorIds);
  CSSSelector = parentCSSSelector + CSSSelector;

  return CSSSelector;
};

/**
 * returns css selector for parent selectors that are within one page
 * @param parentSelectorIds array of parent selector ids from devtools Breadcumb
 * @returns string
 */
SelectorList.prototype.getParentCSSSelectorWithinOnePage = function (parentSelectorIds) {
  var CSSSelector = '';

  for (var i = parentSelectorIds.length - 1; i > 0; i--) {
    var parentSelectorId = parentSelectorIds[i];
    var parentSelector = this.getSelector(parentSelectorId);
    if (parentSelector.willReturnElements()) {
      CSSSelector = parentSelector.selector + ' ' + CSSSelector;
    } else {
      break;
    }
  }

  return CSSSelector;
};

SelectorList.prototype.hasRecursiveElementSelectors = function () {
  var RecursionFound = false;

  this.forEach(function (topSelector) {
    var visitedSelectors = [];

    var checkRecursion = function (parentSelector) {
      // already visited
      if (visitedSelectors.indexOf(parentSelector) !== -1) {
        RecursionFound = true;
        return;
      }

      if (parentSelector.willReturnElements()) {
        visitedSelectors.push(parentSelector);
        var childSelectors = this.getDirectChildSelectors(parentSelector.id);
        childSelectors.forEach(checkRecursion);
        visitedSelectors.pop();
      }
    }.bind(this);

    checkRecursion(topSelector);
  }.bind(this));

  return RecursionFound;
};

module.exports = SelectorList;

},{"./Selector":9}],22:[function(require,module,exports){
var SelectorElement = require('./Selector/SelectorElement');
var SelectorElementAttribute = require('./Selector/SelectorElementAttribute');
var SelectorElementClick = require('./Selector/SelectorElementClick');
var SelectorElementScroll = require('./Selector/SelectorElementScroll');
var SelectorGroup = require('./Selector/SelectorGroup');
var SelectorHTML = require('./Selector/SelectorHTML');
var SelectorImage = require('./Selector/SelectorImage');
var SelectorLink = require('./Selector/SelectorLink');
var SelectorPopupLink = require('./Selector/SelectorPopupLink');
var SelectorTable = require('./Selector/SelectorTable');
var SelectorText = require('./Selector/SelectorText');

module.exports = {
  SelectorElement,
  SelectorElementAttribute,
  SelectorElementClick,
  SelectorElementScroll,
  SelectorGroup,
  SelectorHTML,
  SelectorImage,
  SelectorLink,
  SelectorPopupLink,
  SelectorTable,
  SelectorText
};

},{"./Selector/SelectorElement":10,"./Selector/SelectorElementAttribute":11,"./Selector/SelectorElementClick":12,"./Selector/SelectorElementScroll":13,"./Selector/SelectorGroup":14,"./Selector/SelectorHTML":15,"./Selector/SelectorImage":16,"./Selector/SelectorLink":17,"./Selector/SelectorPopupLink":18,"./Selector/SelectorTable":19,"./Selector/SelectorText":20}],23:[function(require,module,exports){
var Selector = require('./Selector');
var SelectorList = require('./SelectorList');
var Sitemap = function (sitemapObj, options) {
  var $ = options.$;
  var document = options.document;
  var window = options.window;
  // We don't want enumerable properties
  Object.defineProperty(this, '$', {
    value: $,
    enumerable: false
  });
  Object.defineProperty(this, 'window', {
    value: window,
    enumerable: false
  });
  Object.defineProperty(this, 'document', {
    value: document,
    enumerable: false
  });
  if (!this.$) throw new Error('Missing jquery');
  if (!this.document) {
    console.error('extension/scripts/Sitemap.js:22:16:(new Error()).stack', new Error().stack);

    throw new Error("Missing document");
  }
  if (!this.window) throw new Error("Missing window");
  this.initData(sitemapObj);
};

Sitemap.prototype = {

  initData: function (sitemapObj) {
    console.log('extension/scripts/Sitemap.js:33:16:this', this);
    for (var key in sitemapObj) {
      console.log('extension/scripts/Sitemap.js:35:18:key', key);
      this[key] = sitemapObj[key];
    }
    console.log('extension/scripts/Sitemap.js:38:16:this', this);
    var $ = this.$;
    var window = this.window;
    var document = this.document;
    var selectors = this.selectors;
    this.selectors = new SelectorList(this.selectors, { $, window, document });
  },

  /**
   * Returns all selectors or recursively find and return all child selectors of a parent selector.
   * @param parentSelectorId
   * @returns {Array}
   */
  getAllSelectors: function (parentSelectorId) {
    return this.selectors.getAllSelectors(parentSelectorId);
  },

  /**
   * Returns only selectors that are directly under a parent
   * @param parentSelectorId
   * @returns {Array}
   */
  getDirectChildSelectors: function (parentSelectorId) {
    return this.selectors.getDirectChildSelectors(parentSelectorId);
  },

  /**
   * Returns all selector id parameters
   * @returns {Array}
   */
  getSelectorIds: function () {
    var ids = ['_root'];
    this.selectors.forEach(function (selector) {
      ids.push(selector.id);
    });
    return ids;
  },

  /**
   * Returns only selector ids which can have child selectors
   * @returns {Array}
   */
  getPossibleParentSelectorIds: function () {
    var ids = ['_root'];
    this.selectors.forEach(function (selector) {
      if (selector.canHaveChildSelectors()) {
        ids.push(selector.id);
      }
    });
    return ids;
  },

  getStartUrls: function () {
    var startUrls = this.startUrl;
    // single start url
    if (this.startUrl.push === undefined) {
      startUrls = [startUrls];
    }

    var urls = [];
    startUrls.forEach(function (startUrl) {
      // zero padding helper
      var lpad = function (str, length) {
        while (str.length < length) {
          str = '0' + str;
        }
        return str;
      };

      var re = /^(.*?)\[(\d+)\-(\d+)(:(\d+))?\](.*)$/;
      var matches = startUrl.match(re);
      if (matches) {
        var startStr = matches[2];
        var endStr = matches[3];
        var start = parseInt(startStr);
        var end = parseInt(endStr);
        var incremental = 1;
        console.log('extension/scripts/Sitemap.js:113:20:matches[5]', matches[5]);
        if (matches[5] !== undefined) {
          incremental = parseInt(matches[5]);
        }
        for (var i = start; i <= end; i += incremental) {
          // with zero padding
          if (startStr.length === endStr.length) {
            urls.push(matches[1] + lpad(i.toString(), startStr.length) + matches[6]);
          } else {
            urls.push(matches[1] + i + matches[6]);
          }
        }
        return urls;
      } else {
        urls.push(startUrl);
      }
    });

    return urls;
  },

  updateSelector: function (selector, selectorData) {
    // selector is undefined when creating a new one
    if (selector === undefined) {
      var $ = this.$;
      var document = this.document;
      var window = this.window;
      selector = new Selector(selectorData, { $, window, document });
    }

    // update child selectors
    if (selector.id !== undefined && selector.id !== selectorData.id) {
      this.selectors.forEach(function (currentSelector) {
        currentSelector.renameParentSelector(selector.id, selectorData.id);
      });

      // update cyclic selector
      var pos = selectorData.parentSelectors.indexOf(selector.id);
      if (pos !== -1) {
        selectorData.parentSelectors.splice(pos, 1, selectorData.id);
      }
    }

    selector.updateData(selectorData);

    if (this.getSelectorIds().indexOf(selector.id) === -1) {
      this.selectors.push(selector);
    }
  },
  deleteSelector: function (selectorToDelete) {
    this.selectors.forEach(function (selector) {
      if (selector.hasParentSelector(selectorToDelete.id)) {
        selector.removeParentSelector(selectorToDelete.id);
        if (selector.parentSelectors.length === 0) {
          this.deleteSelector(selector);
        }
      }
    }.bind(this));

    for (var i in this.selectors) {
      if (this.selectors[i].id === selectorToDelete.id) {
        this.selectors.splice(i, 1);
        break;
      }
    }
  },
  getDataTableId: function () {
    return this._id.replace(/\./g, '_');
  },
  exportSitemap: function () {
    var sitemapObj = JSON.parse(JSON.stringify(this));
    delete sitemapObj._rev;
    return JSON.stringify(sitemapObj);
  },
  importSitemap: function (sitemapJSON) {
    var sitemapObj = JSON.parse(sitemapJSON);
    this.initData(sitemapObj);
  },
  // return a list of columns than can be exported
  getDataColumns: function () {
    var columns = [];
    this.selectors.forEach(function (selector) {
      columns = columns.concat(selector.getDataColumns());
    });

    return columns;
  },
  getDataExportCsvBlob: function (data) {
    var window = this.window;
    var columns = this.getDataColumns(),
        delimiter = ',',
        newline = '\n',
        csvData = ['\ufeff']; // utf-8 bom char

    // header
    csvData.push(columns.join(delimiter) + newline);

    // data
    data.forEach(function (row) {
      var rowData = [];
      columns.forEach(function (column) {
        var cellData = row[column];
        if (cellData === undefined) {
          cellData = '';
        } else if (typeof cellData === 'object') {
          cellData = JSON.stringify(cellData);
        }

        rowData.push('"' + cellData.replace(/"/g, '""').trim() + '"');
      });
      csvData.push(rowData.join(delimiter) + newline);
    });

    return new window.Blob(csvData, { type: 'text/csv' });
  },
  getSelectorById: function (selectorId) {
    return this.selectors.getSelectorById(selectorId);
  },
  /**
   * Create full clone of sitemap
   * @returns {Sitemap}
   */
  clone: function () {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var clonedJSON = JSON.parse(JSON.stringify(this));
    var sitemap = new Sitemap(clonedJSON, { $, document, window });
    return sitemap;
  }
};

module.exports = Sitemap;

},{"./Selector":9,"./SelectorList":21}],24:[function(require,module,exports){
var Sitemap = require('./Sitemap');

/**
 * From devtools panel there is no possibility to execute XHR requests. So all requests to a remote CouchDb must be
 * handled through Background page. StoreDevtools is a simply a proxy store
 * @constructor
 */
var StoreDevtools = function (options) {
  this.$ = options.$;
  this.document = options.document;
  this.window = options.window;
  if (!this.$) throw new Error('jquery required');
  if (!this.document) throw new Error("Missing document");
  if (!this.window) throw new Error("Missing window");
};

StoreDevtools.prototype = {
  createSitemap: function (sitemap, callback) {
    var request = {
      createSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap))
    };

    chrome.runtime.sendMessage(request, function (callbackFn, originalSitemap, newSitemap) {
      originalSitemap._rev = newSitemap._rev;
      callbackFn(originalSitemap);
    }.bind(this, callback, sitemap));
  },
  saveSitemap: function (sitemap, callback) {
    this.createSitemap(sitemap, callback);
  },
  deleteSitemap: function (sitemap, callback) {
    var request = {
      deleteSitemap: true,
      sitemap: JSON.parse(JSON.stringify(sitemap))
    };
    chrome.runtime.sendMessage(request, function (response) {
      callback();
    });
  },
  getAllSitemaps: function (callback) {
    var $ = this.$;
    var document = this.document;
    var window = this.window;
    var request = {
      getAllSitemaps: true
    };

    chrome.runtime.sendMessage(request, function (response) {
      var sitemaps = [];

      for (var i in response) {
        sitemaps.push(new Sitemap(response[i], { $, document, window }));
      }
      callback(sitemaps);
    });
  },
  getSitemapData: function (sitemap, callback) {
    var request = {
      getSitemapData: true,
      sitemap: JSON.parse(JSON.stringify(sitemap))
    };

    chrome.runtime.sendMessage(request, function (response) {
      callback(response);
    });
  },
  sitemapExists: function (sitemapId, callback) {
    var request = {
      sitemapExists: true,
      sitemapId: sitemapId
    };

    chrome.runtime.sendMessage(request, function (response) {
      callback(response);
    });
  }
};

module.exports = StoreDevtools;

},{"./Sitemap":23}],25:[function(require,module,exports){
var CssSelector = require('css-selector').CssSelector;
// TODO get rid of jquery

/**
 * Only Elements unique will be added to this array
 * @constructor
 */
function UniqueElementList(clickElementUniquenessType, options) {
  var $ = options.$;
  var window = options.window;
  var document = options.document;

  Object.defineProperty(this, '$', {
    value: $,
    enumerable: false
  });
  Object.defineProperty(this, 'window', {
    value: window,
    enumerable: false
  });
  Object.defineProperty(this, 'document', {
    value: document,
    enumerable: false
  });
  if (!this.$) throw new Error('jquery required');
  if (!this.document) {
    throw new Error("Missing document");
  }
  if (!this.window) throw new Error("Missing window");
  this.clickElementUniquenessType = clickElementUniquenessType;
  this.addedElements = {};
}

UniqueElementList.prototype = [];

UniqueElementList.prototype.push = function (element) {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  if (this.isAdded(element)) {
    return false;
  } else {
    var elementUniqueId = this.getElementUniqueId(element);
    this.addedElements[elementUniqueId] = true;
    Array.prototype.push.call(this, $(element).clone(true)[0]);
    return true;
  }
};

UniqueElementList.prototype.getElementUniqueId = function (element) {
  var $ = this.$;
  var document = this.document;
  var window = this.window;
  if (this.clickElementUniquenessType === 'uniqueText') {
    var elementText = $(element).text().trim();
    return elementText;
  } else if (this.clickElementUniquenessType === 'uniqueHTMLText') {
    var elementHTML = $("<div class='-web-scraper-should-not-be-visible'>").append($(element).eq(0).clone()).html();
    return elementHTML;
  } else if (this.clickElementUniquenessType === 'uniqueHTML') {
    // get element without text
    var $element = $(element).eq(0).clone();

    var removeText = function ($element) {
      $element.contents().filter(function () {
        if (this.nodeType !== 3) {
          removeText($(this));
        }
        return this.nodeType == 3; // Node.TEXT_NODE
      }).remove();
    };
    removeText($element);

    var elementHTML = $("<div class='-web-scraper-should-not-be-visible'>").append($element).html();
    return elementHTML;
  } else if (this.clickElementUniquenessType === 'uniqueCSSSelector') {
    var cs = new CssSelector({
      enableSmartTableSelector: false,
      parent: $('body')[0],
      enableResultStripping: false
    });
    var CSSSelector = cs.getCssSelector([element]);
    return CSSSelector;
  } else {
    throw 'Invalid clickElementUniquenessType ' + this.clickElementUniquenessType;
  }
};

module.exports = UniqueElementList;

UniqueElementList.prototype.isAdded = function (element) {
  var elementUniqueId = this.getElementUniqueId(element);
  var isAdded = elementUniqueId in this.addedElements;
  return isAdded;
};

},{"css-selector":28}],26:[function(require,module,exports){
var jquery = require('jquery-deferred');
var BackgroundScript = require('./BackgroundScript');
/**
 * @param location	configure from where the content script is being accessed (ContentScript, BackgroundPage, DevTools)
 * @returns BackgroundScript
 */
var getBackgroundScript = function (location) {
  // Handle calls from different places
  if (location === 'BackgroundScript') {
    return BackgroundScript;
  } else if (location === 'DevTools' || location === 'ContentScript') {
    // if called within background script proxy calls to content script
    var backgroundScript = {};

    Object.keys(BackgroundScript).forEach(function (attr) {
      if (typeof BackgroundScript[attr] === 'function') {
        backgroundScript[attr] = function (request) {
          var reqToBackgroundScript = {
            backgroundScriptCall: true,
            fn: attr,
            request: request
          };

          var deferredResponse = jquery.Deferred();

          chrome.runtime.sendMessage(reqToBackgroundScript, function (response) {
            deferredResponse.resolve(response);
          });

          return deferredResponse;
        };
      } else {
        backgroundScript[attr] = BackgroundScript[attr];
      }
    });

    return backgroundScript;
  } else {
    throw new Error('Invalid BackgroundScript initialization - ' + location);
  }
};

module.exports = getBackgroundScript;

},{"./BackgroundScript":4,"jquery-deferred":29}],27:[function(require,module,exports){
var getBackgroundScript = require('./getBackgroundScript');
var ContentScript = require('./ContentScript');
/**
 *
 * @param location	configure from where the content script is being accessed (ContentScript, BackgroundPage, DevTools)
 * @param options
 * @returns ContentScript
 */
var getContentScript = function (location) {
  var contentScript;

  // Handle calls from different places
  if (location === 'ContentScript') {
    contentScript = ContentScript;
    contentScript.backgroundScript = getBackgroundScript('ContentScript');
    return contentScript;
  } else if (location === 'BackgroundScript' || location === 'DevTools') {
    var backgroundScript = getBackgroundScript(location);

    // if called within background script proxy calls to content script
    contentScript = {};
    Object.keys(ContentScript).forEach(function (attr) {
      if (typeof ContentScript[attr] === 'function') {
        contentScript[attr] = function (request) {
          var reqToContentScript = {
            contentScriptCall: true,
            fn: attr,
            request: request
          };

          return backgroundScript.executeContentScript(reqToContentScript);
        };
      } else {
        contentScript[attr] = ContentScript[attr];
      }
    });
    contentScript.backgroundScript = backgroundScript;
    return contentScript;
  } else {
    throw new Error('Invalid ContentScript initialization - ' + location);
  }
};

module.exports = getContentScript;

},{"./ContentScript":5,"./getBackgroundScript":26}],28:[function(require,module,exports){
module.exports = {
	CssSelector,
	ElementSelector,
	ElementSelectorList
}


function CssSelector (options) {

	var me = this;

	// defaults
	this.ignoredTags = ['font', 'b', 'i', 's'];
	this.parent = options.document || options.parent
	this.document = options.document || options.parent 
	this.ignoredClassBase = false;
	this.enableResultStripping = true;
	this.enableSmartTableSelector = false;
	this.ignoredClasses = [];
    this.allowMultipleSelectors = false;
	this.query = function (selector) {
		return me.parent.querySelectorAll(selector);
	};

	// overrides defaults with options
	for (var i in options) {
		this[i] = options[i];
	}
};

// TODO refactor element selector list into a ~ class
function ElementSelector (element, ignoredClasses) {

	this.element = element;
	this.isDirectChild = true;
	this.tag = element.localName;
	this.tag = this.tag.replace(/:/g, '\\:');

	// nth-of-child(n+1)
	this.indexn = null;
	this.index = 1;
	this.id = null;
	this.classes = new Array();

	// do not add additinal info to html, body tags.
	// html:nth-of-type(1) cannot be selected
	if(this.tag === 'html' || this.tag === 'HTML'
		|| this.tag === 'body' || this.tag === 'BODY') {
		this.index = null;
		return;
	}

	if (element.parentNode !== undefined) {
		// nth-child
		//this.index = [].indexOf.call(element.parentNode.children, element)+1;

		// nth-of-type
		for (var i = 0; i < element.parentNode.children.length; i++) {
			var child = element.parentNode.children[i];
			if (child === element) {
				break;
			}
			if (child.tagName === element.tagName) {
				this.index++;
			}
		}
	}

	if (element.id !== '') {
		if (typeof element.id === 'string') {
			this.id = element.id;
			this.id = this.id.replace(/:/g, '\\:');
		}
	}

	for (var i = 0; i < element.classList.length; i++) {
		var cclass = element.classList[i];
		if (ignoredClasses.indexOf(cclass) === -1) {
			cclass = cclass.replace(/:/g, '\\:');
			this.classes.push(cclass);
		}
	}
};

function ElementSelectorList (CssSelector) {
	this.CssSelector = CssSelector;
};

ElementSelectorList.prototype = new Array();

ElementSelectorList.prototype.getCssSelector = function () {

	var resultSelectors = [];

	// TDD
	for (var i = 0; i < this.length; i++) {
		var selector = this[i];

		var isFirstSelector = i === this.length-1;
		var resultSelector = selector.getCssSelector(isFirstSelector);

		if (this.CssSelector.enableSmartTableSelector) {
			if (selector.tag === 'tr') {
				if (selector.element.children.length === 2) {
					if (selector.element.children[0].tagName === 'TD'
						|| selector.element.children[0].tagName === 'TH'
						|| selector.element.children[0].tagName === 'TR') {

						var text = selector.element.children[0].textContent;
						text = text.trim();

						// escape quotes
						text.replace(/(\\*)(')/g, function (x) {
							var l = x.length;
							return (l % 2) ? x : x.substring(0, l - 1) + "\\'";
						});
						resultSelector += ":contains('" + text + "')";
					}
				}
			}
		}

		resultSelectors.push(resultSelector);
	}

	var resultCSSSelector = resultSelectors.reverse().join(' ');
	return resultCSSSelector;
};

ElementSelector.prototype = {

	getCssSelector: function (isFirstSelector) {

		if(isFirstSelector === undefined) {
			isFirstSelector = false;
		}

		var selector = this.tag;
		if (this.id !== null) {
			selector += '#' + this.id;
		}
		if (this.classes.length) {
			for (var i = 0; i < this.classes.length; i++) {
				selector += "." + this.classes[i];
			}
		}
		if (this.index !== null) {
			selector += ':nth-of-type(' + this.index + ')';
		}
		if (this.indexn !== null && this.indexn !== -1) {
			selector += ':nth-of-type(n+' + this.indexn + ')';
		}
		if(this.isDirectChild && isFirstSelector === false) {
			selector = "> "+selector;
		}

		return selector;
	},
	// merges this selector with another one.
	merge: function (mergeSelector) {

		if (this.tag !== mergeSelector.tag) {
			throw "different element selected (tag)";
		}

		if (this.index !== null) {
			if (this.index !== mergeSelector.index) {

				// use indexn only for two elements
				if (this.indexn === null) {
					var indexn = Math.min(mergeSelector.index, this.index);
					if (indexn > 1) {
						this.indexn = Math.min(mergeSelector.index, this.index);
					}
				}
				else {
					this.indexn = -1;
				}

				this.index = null;
			}
		}

		if(this.isDirectChild === true) {
			this.isDirectChild = mergeSelector.isDirectChild;
		}

		if (this.id !== null) {
			if (this.id !== mergeSelector.id) {
				this.id = null;
			}
		}

		if (this.classes.length !== 0) {
			var classes = new Array();

			for (var i in this.classes) {
				var cclass = this.classes[i];
				if (mergeSelector.classes.indexOf(cclass) !== -1) {
					classes.push(cclass);
				}
			}

			this.classes = classes;
		}
	}
};

CssSelector.prototype = {
	mergeElementSelectors: function (newSelecors) {

		if (newSelecors.length < 1) {
			throw "No selectors specified";
		}
		else if (newSelecors.length === 1) {
			return newSelecors[0];
		}

		// check selector total count
		var elementCountInSelector = newSelecors[0].length;
		for (var i = 0; i < newSelecors.length; i++) {
			var selector = newSelecors[i];
			if (selector.length !== elementCountInSelector) {
				throw "Invalid element count in selector";
			}
		}

		// merge selectors
		var resultingElements = newSelecors[0];
		for (var i = 1; i < newSelecors.length; i++) {
			var mergeElements = newSelecors[i];

			for (var j = 0; j < elementCountInSelector; j++) {
				resultingElements[j].merge(mergeElements[j]);
			}
		}
		return resultingElements;
	},
	stripSelector: function (selectors) {

		var cssSeletor = selectors.getCssSelector();
		var baseSelectedElements = this.query(cssSeletor);

		var compareElements = function (elements) {
			if (baseSelectedElements.length !== elements.length) {
				return false;
			}

			for (var j = 0; j < baseSelectedElements.length; j++) {
				if ([].indexOf.call(elements, baseSelectedElements[j]) === -1) {
					return false;
				}
			}
			return true;
		};
		// strip indexes
		for (var i = 0; i < selectors.length; i++) {
			var selector = selectors[i];
			if (selector.index !== null) {
				var index = selector.index;
				selector.index = null;
				var cssSeletor = selectors.getCssSelector();
				var newSelectedElements = this.query(cssSeletor);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selector.index = index;
				}
			}
		}

		// strip isDirectChild
		for (var i = 0; i < selectors.length; i++) {
			var selector = selectors[i];
			if (selector.isDirectChild === true) {
				selector.isDirectChild = false;
				var cssSeletor = selectors.getCssSelector();
				var newSelectedElements = this.query(cssSeletor);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selector.isDirectChild = true;
				}
			}
		}

		// strip ids
		for (var i = 0; i < selectors.length; i++) {
			var selector = selectors[i];
			if (selector.id !== null) {
				var id = selector.id;
				selector.id = null;
				var cssSeletor = selectors.getCssSelector();
				var newSelectedElements = this.query(cssSeletor);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selector.id = id;
				}
			}
		}

		// strip classes
		for (var i = 0; i < selectors.length; i++) {
			var selector = selectors[i];
			if (selector.classes.length !== 0) {
				for (var j = selector.classes.length - 1; j > 0; j--) {
					var cclass = selector.classes[j];
					selector.classes.splice(j, 1);
					var cssSeletor = selectors.getCssSelector();
					var newSelectedElements = this.query(cssSeletor);
					// if results doesn't match then undo changes
					if (!compareElements(newSelectedElements)) {
						selector.classes.splice(j, 0, cclass);
					}
				}
			}
		}

		// strip tags
		for (var i = selectors.length - 1; i > 0; i--) {
			var selector = selectors[i];
			selectors.splice(i, 1);
			var cssSeletor = selectors.getCssSelector();
			var newSelectedElements = this.query(cssSeletor);
			// if results doesn't match then undo changes
			if (!compareElements(newSelectedElements)) {
				selectors.splice(i, 0, selector);
			}
		}

		return selectors;
	},
	getElementSelectors: function (elements, top) {
		var elementSelectors = [];

		for (var i = 0; i < elements.length; i++) {
			var element = elements[i];
			var elementSelector = this.getElementSelector(element, top);
			elementSelectors.push(elementSelector);
		}

		return elementSelectors;
	},
	getElementSelector: function (element, top) {

		var elementSelectorList = new ElementSelectorList(this);
		while (true) {
			if (element === this.parent) {
				break;
			}
			else if (element === undefined || element === this.document) {
				throw 'element is not a child of the given parent';
			}
			if (this.isIgnoredTag(element.tagName)) {

				element = element.parentNode;
				continue;
			}
			if (top > 0) {
				top--;
				element = element.parentNode;
				continue;
			}

			var selector = new ElementSelector(element, this.ignoredClasses);
			// document does not have a tagName
			if(element.parentNode === this.document || this.isIgnoredTag(element.parentNode.tagName)) {
				selector.isDirectChild = false;
			}

			elementSelectorList.push(selector);
			element = element.parentNode;
		}

		return elementSelectorList;
	},

    /**
     * Compares whether two elements are similar. Similar elements should
     * have a common parrent and all parent elements should be the same type.
     * @param element1
     * @param element2
     */
    checkSimilarElements: function(element1, element2) {

        while (true) {

            if(element1.tagName !== element2.tagName) {
                return false;
            }
            if(element1 === element2) {
                return true;
            }

            // stop at body tag
            if (element1 === undefined || element1.tagName === 'body'
                || element1.tagName === 'BODY') {
                return false;
            }
            if (element2 === undefined || element2.tagName === 'body'
                || element2.tagName === 'BODY') {
                return false;
            }

            element1 = element1.parentNode;
            element2 = element2.parentNode;
        }
    },

    /**
     * Groups elements into groups if the emelents are not similar
     * @param elements
     */
    getElementGroups: function(elements) {

        // first elment is in the first group
        // @TODO maybe i dont need this?
        var groups = [[elements[0]]];

        for(var i = 1; i < elements.length; i++) {
            var elementNew = elements[i];
            var addedToGroup = false;
            for(var j = 0; j < groups.length; j++) {
                var group = groups[j];
                var elementGroup = group[0];
                if(this.checkSimilarElements(elementNew, elementGroup)) {
                    group.push(elementNew);
                    addedToGroup = true;
                    break;
                }
            }

            // add new group
            if(!addedToGroup) {
                groups.push([elementNew]);
            }
        }

        return groups;
    },
	getCssSelector: function (elements, top) {

		top = top || 0;

		var enableSmartTableSelector = this.enableSmartTableSelector;
		if (elements.length > 1) {
			this.enableSmartTableSelector = false;
		}

        // group elements into similarity groups
        var elementGroups = this.getElementGroups(elements);

        var resultCSSSelector;

        if(this.allowMultipleSelectors) {

            var groupSelectors = [];

            for(var i = 0; i < elementGroups.length; i++) {
                var groupElements = elementGroups[i];

                var elementSelectors = this.getElementSelectors(groupElements, top);
                var resultSelector = this.mergeElementSelectors(elementSelectors);
                if (this.enableResultStripping) {
                    resultSelector = this.stripSelector(resultSelector);
                }

                groupSelectors.push(resultSelector.getCssSelector());
            }

            resultCSSSelector = groupSelectors.join(', ');
        }
        else {
            if(elementGroups.length !== 1) {
                throw "found multiple element groups, but allowMultipleSelectors disabled";
            }

            var elementSelectors = this.getElementSelectors(elements, top);
            var resultSelector = this.mergeElementSelectors(elementSelectors);
            if (this.enableResultStripping) {
                resultSelector = this.stripSelector(resultSelector);
            }

            resultCSSSelector = resultSelector.getCssSelector();
        }

		this.enableSmartTableSelector = enableSmartTableSelector;

		// strip down selector
		return resultCSSSelector;
	},
	isIgnoredTag: function (tag) {
		return this.ignoredTags.indexOf(tag.toLowerCase()) !== -1;
	}
};

},{}],29:[function(require,module,exports){

module.exports = require('./lib/jquery-deferred');
},{"./lib/jquery-deferred":32}],30:[function(require,module,exports){
var jQuery = module.exports = require("./jquery-core.js"),
	core_rspace = /\s+/;
/**
* jQuery Callbacks
*
* Code from: https://github.com/jquery/jquery/blob/master/src/callbacks.js
*
*/


// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.split( core_rspace ), function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Control if a given callback is in the list
			has: function( fn ) {
				return jQuery.inArray( fn, list ) > -1;
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				args = args || [];
				args = [ context, args.slice ? args.slice() : args ];
				if ( list && ( !fired || stack ) ) {
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


},{"./jquery-core.js":31}],31:[function(require,module,exports){
/**
* jQuery core object.
*
* Worker with jQuery deferred
*
* Code from: https://github.com/jquery/jquery/blob/master/src/core.js
*
*/

var jQuery = module.exports = {
	type: type
	, isArray: isArray
	, isFunction: isFunction
	, isPlainObject: isPlainObject
	, each: each
	, extend: extend
	, noop: function() {}
};

var toString = Object.prototype.toString;

var class2type = {};
// Populate the class2type map
"Boolean Number String Function Array Date RegExp Object".split(" ").forEach(function(name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});


function type( obj ) {
	return obj == null ?
		String( obj ) :
			class2type[ toString.call(obj) ] || "object";
}

function isFunction( obj ) {
	return jQuery.type(obj) === "function";
}

function isArray( obj ) {
	return jQuery.type(obj) === "array";
}

function each( object, callback, args ) {
	var name, i = 0,
	length = object.length,
	isObj = length === undefined || isFunction( object );

	if ( args ) {
		if ( isObj ) {
			for ( name in object ) {
				if ( callback.apply( object[ name ], args ) === false ) {
					break;
				}
			}
		} else {
			for ( ; i < length; ) {
				if ( callback.apply( object[ i++ ], args ) === false ) {
					break;
				}
			}
		}

		// A special, fast, case for the most common use of each
	} else {
		if ( isObj ) {
			for ( name in object ) {
				if ( callback.call( object[ name ], name, object[ name ] ) === false ) {
					break;
				}
			}
		} else {
			for ( ; i < length; ) {
				if ( callback.call( object[ i ], i, object[ i++ ] ) === false ) {
					break;
				}
			}
		}
	}

	return object;
}

function isPlainObject( obj ) {
	// Must be an Object.
	if ( !obj || jQuery.type(obj) !== "object" ) {
		return false;
	}
	return true;
}

function extend() {
	var options, name, src, copy, copyIsArray, clone,
	target = arguments[0] || {},
	i = 1,
	length = arguments.length,
	deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( length === i ) {
		target = this;
		--i;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

					// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};



},{}],32:[function(require,module,exports){

/*!
* jquery-deferred
* Copyright(c) 2011 Hidden <zzdhidden@gmail.com>
* MIT Licensed
*/

/**
* Library version.
*/

var jQuery = module.exports = require("./jquery-callbacks.js"),
	core_slice = Array.prototype.slice;

/**
* jQuery deferred
*
* Code from: https://github.com/jquery/jquery/blob/master/src/deferred.js
* Doc: http://api.jquery.com/category/deferred-object/
*
*/

jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var action = tuple[ 0 ],
								fn = fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ]( jQuery.isFunction( fn ) ?
								function() {
									var returned = fn.apply( this, arguments );
									if ( returned && jQuery.isFunction( returned.promise ) ) {
										returned.promise()
											.done( newDefer.resolve )
											.fail( newDefer.reject )
											.progress( newDefer.notify );
									} else {
										newDefer[ action + "With" ]( this === deferred ? newDefer : this, [ returned ] );
									}
								} :
								newDefer[ action ]
							);
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ] = list.fire
			deferred[ tuple[0] ] = list.fire;
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = core_slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? core_slice.call( arguments ) : value;
					if( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});

},{"./jquery-callbacks.js":30}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleHRlbnNpb24vYXNzZXRzL2Jhc2U2NC5qcyIsImV4dGVuc2lvbi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvQXBwLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvQmFja2dyb3VuZFNjcmlwdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL0NvbnRlbnRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db250ZW50U2VsZWN0b3IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9Db250cm9sbGVyLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvRWxlbWVudFF1ZXJ5LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRDbGljay5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudFNjcm9sbC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1NlbGVjdG9yL1NlbGVjdG9yR3JvdXAuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckhUTUwuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvckltYWdlLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JMaW5rLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JQb3B1cExpbmsuanMiLCJleHRlbnNpb24vc2NyaXB0cy9TZWxlY3Rvci9TZWxlY3RvclRhYmxlLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3IvU2VsZWN0b3JUZXh0LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3JMaXN0LmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2VsZWN0b3JzLmpzIiwiZXh0ZW5zaW9uL3NjcmlwdHMvU2l0ZW1hcC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL1N0b3JlRGV2dG9vbHMuanMiLCJleHRlbnNpb24vc2NyaXB0cy9VbmlxdWVFbGVtZW50TGlzdC5qcyIsImV4dGVuc2lvbi9zY3JpcHRzL2dldEJhY2tncm91bmRTY3JpcHQuanMiLCJleHRlbnNpb24vc2NyaXB0cy9nZXRDb250ZW50U2NyaXB0LmpzIiwibm9kZV9tb2R1bGVzL2Nzcy1zZWxlY3Rvci9saWIvQ3NzU2VsZWN0b3IuanMiLCJub2RlX21vZHVsZXMvanF1ZXJ5LWRlZmVycmVkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWNhbGxiYWNrcy5qcyIsIm5vZGVfbW9kdWxlcy9qcXVlcnktZGVmZXJyZWQvbGliL2pxdWVyeS1jb3JlLmpzIiwibm9kZV9tb2R1bGVzL2pxdWVyeS1kZWZlcnJlZC9saWIvanF1ZXJ5LWRlZmVycmVkLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsSUFBSSxTQUFTLFFBQVEsaUJBQVIsQ0FBYjtBQUNBOzs7O0FBSUEsSUFBSSxTQUFTOztBQUVYLGdCQUFjLFVBQVUsSUFBVixFQUFnQjtBQUM1QixRQUFJLG1CQUFtQixPQUFPLFFBQVAsRUFBdkI7QUFDQSxRQUFJLFNBQVMsSUFBSSxVQUFKLEVBQWI7QUFDQSxXQUFPLE1BQVAsR0FBZ0IsWUFBWTtBQUMxQixVQUFJLFVBQVUsT0FBTyxNQUFyQjtBQUNBLFVBQUksU0FBUyxRQUFRLEtBQVIsQ0FBYyxHQUFkLEVBQW1CLENBQW5CLENBQWI7QUFDQSx1QkFBaUIsT0FBakIsQ0FBeUIsTUFBekI7QUFDRCxLQUpEO0FBS0EsV0FBTyxhQUFQLENBQXFCLElBQXJCOztBQUVBLFdBQU8saUJBQWlCLE9BQWpC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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdlQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuLyoqXG4gKiBAdXJsIGh0dHA6Ly9qc3BlcmYuY29tL2Jsb2ItYmFzZTY0LWNvbnZlcnNpb25cbiAqIEB0eXBlIHt7YmxvYlRvQmFzZTY0OiBibG9iVG9CYXNlNjQsIGJhc2U2NFRvQmxvYjogYmFzZTY0VG9CbG9ifX1cbiAqL1xudmFyIEJhc2U2NCA9IHtcblxuICBibG9iVG9CYXNlNjQ6IGZ1bmN0aW9uIChibG9iKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBkYXRhVXJsID0gcmVhZGVyLnJlc3VsdFxuICAgICAgdmFyIGJhc2U2NCA9IGRhdGFVcmwuc3BsaXQoJywnKVsxXVxuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKGJhc2U2NClcbiAgICB9XG4gICAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoYmxvYilcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGJhc2U2NFRvQmxvYjogZnVuY3Rpb24gKGJhc2U2NCwgbWltZVR5cGUpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGJpbmFyeSA9IGF0b2IoYmFzZTY0KVxuICAgIHZhciBsZW4gPSBiaW5hcnkubGVuZ3RoXG4gICAgdmFyIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihsZW4pXG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWZmZXIpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmlld1tpXSA9IGJpbmFyeS5jaGFyQ29kZUF0KGkpXG4gICAgfVxuICAgIHZhciBibG9iID0gbmV3IEJsb2IoW3ZpZXddLCB7dHlwZTogbWltZVR5cGV9KVxuICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShibG9iKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlNjRcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxuLyoqXG4gKiBAYXV0aG9yIE1hcnRpbnMgQmFsb2Rpc1xuICpcbiAqIEFuIGFsdGVybmF0aXZlIHZlcnNpb24gb2YgJC53aGVuIHdoaWNoIGNhbiBiZSB1c2VkIHRvIGV4ZWN1dGUgYXN5bmNocm9ub3VzXG4gKiBjYWxscyBzZXF1ZW50aWFsbHkgb25lIGFmdGVyIGFub3RoZXIuXG4gKlxuICogQHJldHVybnMganF1ZXJ5RGVmZXJyZWQoKS5wcm9taXNlKClcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3aGVuQ2FsbFNlcXVlbnRpYWxseSAoZnVuY3Rpb25DYWxscykge1xuICB2YXIgZGVmZXJyZWRSZXNvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgdmFyIHJlc3VsdERhdGEgPSBbXVxuXG5cdC8vIG5vdGhpbmcgdG8gZG9cbiAgaWYgKGZ1bmN0aW9uQ2FsbHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGRlZmVycmVkUmVzb25zZS5yZXNvbHZlKHJlc3VsdERhdGEpLnByb21pc2UoKVxuICB9XG5cbiAgdmFyIGN1cnJlbnREZWZlcnJlZCA9IGZ1bmN0aW9uQ2FsbHMuc2hpZnQoKSgpXG5cdC8vIGV4ZWN1dGUgc3luY2hyb25vdXMgY2FsbHMgc3luY2hyb25vdXNseVxuICB3aGlsZSAoY3VycmVudERlZmVycmVkLnN0YXRlKCkgPT09ICdyZXNvbHZlZCcpIHtcbiAgICBjdXJyZW50RGVmZXJyZWQuZG9uZShmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgcmVzdWx0RGF0YS5wdXNoKGRhdGEpXG4gICAgfSlcbiAgICBpZiAoZnVuY3Rpb25DYWxscy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBkZWZlcnJlZFJlc29uc2UucmVzb2x2ZShyZXN1bHREYXRhKS5wcm9taXNlKClcbiAgICB9XG4gICAgY3VycmVudERlZmVycmVkID0gZnVuY3Rpb25DYWxscy5zaGlmdCgpKClcbiAgfVxuXG5cdC8vIGhhbmRsZSBhc3luYyBjYWxsc1xuICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gaGFuZGxlIG1peGVkIHN5bmMgY2FsbHNcbiAgICB3aGlsZSAoY3VycmVudERlZmVycmVkLnN0YXRlKCkgPT09ICdyZXNvbHZlZCcpIHtcbiAgICAgIGN1cnJlbnREZWZlcnJlZC5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHJlc3VsdERhdGEucHVzaChkYXRhKVxuICAgICAgfSlcbiAgICAgIGlmIChmdW5jdGlvbkNhbGxzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBkZWZlcnJlZFJlc29uc2UucmVzb2x2ZShyZXN1bHREYXRhKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgY3VycmVudERlZmVycmVkID0gZnVuY3Rpb25DYWxscy5zaGlmdCgpKClcbiAgICB9XG4gIH0sIDEwKVxuXG4gIHJldHVybiBkZWZlcnJlZFJlc29uc2UucHJvbWlzZSgpXG59XG4iLCJ2YXIgU3RvcmVEZXZ0b29scyA9IHJlcXVpcmUoJy4vU3RvcmVEZXZ0b29scycpXG52YXIgU2l0ZW1hcENvbnRyb2xsZXIgPSByZXF1aXJlKCcuL0NvbnRyb2xsZXInKVxuXG4kKGZ1bmN0aW9uICgpIHtcblx0Ly8gaW5pdCBib290c3RyYXAgYWxlcnRzXG4gICQoJy5hbGVydCcpLmFsZXJ0KClcblxuICB2YXIgc3RvcmUgPSBuZXcgU3RvcmVEZXZ0b29scyh7JCwgZG9jdW1lbnQsIHdpbmRvd30pXG4gIG5ldyBTaXRlbWFwQ29udHJvbGxlcih7XG4gICAgc3RvcmU6IHN0b3JlLFxuICAgIHRlbXBsYXRlRGlyOiAndmlld3MvJ1xuICB9LCB7JCwgZG9jdW1lbnQsIHdpbmRvd30pXG59KVxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG4vKipcbiAqIENvbnRlbnRTY3JpcHQgdGhhdCBjYW4gYmUgY2FsbGVkIGZyb20gYW55d2hlcmUgd2l0aGluIHRoZSBleHRlbnNpb25cbiAqL1xudmFyIEJhY2tncm91bmRTY3JpcHQgPSB7XG5cbiAgZHVtbXk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ganF1ZXJ5LkRlZmVycmVkKCkucmVzb2x2ZSgnZHVtbXknKS5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgaWQgb2YgdGhlIHRhYiB0aGF0IGlzIHZpc2libGUgdG8gdXNlclxuXHQgKiBAcmV0dXJucyBqcXVlcnkuRGVmZXJyZWQoKSBpbnRlZ2VyXG5cdCAqL1xuICBnZXRBY3RpdmVUYWJJZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIGNocm9tZS50YWJzLnF1ZXJ5KHtcbiAgICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAgIGN1cnJlbnRXaW5kb3c6IHRydWVcbiAgICB9LCBmdW5jdGlvbiAodGFicykge1xuICAgICAgaWYgKHRhYnMubGVuZ3RoIDwgMSkge1xuXHRcdFx0XHQvLyBAVE9ETyBtdXN0IGJlIHJ1bm5pbmcgd2l0aGluIHBvcHVwLiBtYXliZSBmaW5kIGFub3RoZXIgYWN0aXZlIHdpbmRvdz9cbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZWplY3QoXCJjb3VsZG4ndCBmaW5kIHRoZSBhY3RpdmUgdGFiXCIpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGFiSWQgPSB0YWJzWzBdLmlkXG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSh0YWJJZClcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBFeGVjdXRlIGEgZnVuY3Rpb24gd2l0aGluIHRoZSBhY3RpdmUgdGFiIHdpdGhpbiBjb250ZW50IHNjcmlwdFxuXHQgKiBAcGFyYW0gcmVxdWVzdC5mblx0ZnVuY3Rpb24gdG8gY2FsbFxuXHQgKiBAcGFyYW0gcmVxdWVzdC5yZXF1ZXN0XHRyZXF1ZXN0IHRoYXQgd2lsbCBiZSBwYXNzZWQgdG8gdGhlIGZ1bmN0aW9uXG5cdCAqL1xuICBleGVjdXRlQ29udGVudFNjcmlwdDogZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICB2YXIgcmVxVG9Db250ZW50U2NyaXB0ID0ge1xuICAgICAgY29udGVudFNjcmlwdENhbGw6IHRydWUsXG4gICAgICBmbjogcmVxdWVzdC5mbixcbiAgICAgIHJlcXVlc3Q6IHJlcXVlc3QucmVxdWVzdFxuICAgIH1cbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGRlZmVycmVkQWN0aXZlVGFiSWQgPSB0aGlzLmdldEFjdGl2ZVRhYklkKClcbiAgICBkZWZlcnJlZEFjdGl2ZVRhYklkLmRvbmUoZnVuY3Rpb24gKHRhYklkKSB7XG4gICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwgcmVxVG9Db250ZW50U2NyaXB0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2VcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tncm91bmRTY3JpcHRcbiIsInZhciBDb250ZW50U2VsZWN0b3IgPSByZXF1aXJlKCcuL0NvbnRlbnRTZWxlY3RvcicpXG52YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbi8qKlxuICogQ29udGVudFNjcmlwdCB0aGF0IGNhbiBiZSBjYWxsZWQgZnJvbSBhbnl3aGVyZSB3aXRoaW4gdGhlIGV4dGVuc2lvblxuICovXG52YXIgQ29udGVudFNjcmlwdCA9IHtcblxuXHQvKipcblx0ICogRmV0Y2hcblx0ICogQHBhcmFtIHJlcXVlc3QuQ1NTU2VsZWN0b3JcdGNzcyBzZWxlY3RvciBhcyBzdHJpbmdcblx0ICogQHJldHVybnMganF1ZXJ5LkRlZmVycmVkKClcblx0ICovXG4gIGdldEhUTUw6IGZ1bmN0aW9uIChyZXF1ZXN0LCBvcHRpb25zKSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiRcbiAgICB2YXIgZGVmZXJyZWRIVE1MID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgaHRtbCA9ICQocmVxdWVzdC5DU1NTZWxlY3RvcikuY2xvbmUoKS53cmFwKCc8cD4nKS5wYXJlbnQoKS5odG1sKClcbiAgICBkZWZlcnJlZEhUTUwucmVzb2x2ZShodG1sKVxuICAgIHJldHVybiBkZWZlcnJlZEhUTUwucHJvbWlzZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJlbW92ZXMgY3VycmVudCBjb250ZW50IHNlbGVjdG9yIGlmIGlzIGluIHVzZSB3aXRoaW4gdGhlIHBhZ2Vcblx0ICogQHJldHVybnMganF1ZXJ5LkRlZmVycmVkKClcblx0ICovXG4gIHJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGNvbnRlbnRTZWxlY3RvciA9IHdpbmRvdy5jc1xuICAgIGlmIChjb250ZW50U2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKClcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGVudFNlbGVjdG9yLnJlbW92ZUdVSSgpXG4gICAgICB3aW5kb3cuY3MgPSB1bmRlZmluZWRcbiAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFNlbGVjdCBlbGVtZW50cyB3aXRoaW4gdGhlIHBhZ2Vcblx0ICogQHBhcmFtIHJlcXVlc3QucGFyZW50Q1NTU2VsZWN0b3Jcblx0ICogQHBhcmFtIHJlcXVlc3QuYWxsb3dlZEVsZW1lbnRzXG5cdCAqL1xuICBzZWxlY3RTZWxlY3RvcjogZnVuY3Rpb24gKHJlcXVlc3QsIG9wdGlvbnMpIHtcbiAgICB2YXIgJCA9IG9wdGlvbnMuJFxuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHRoaXMucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpLmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbnRlbnRTZWxlY3RvciA9IG5ldyBDb250ZW50U2VsZWN0b3Ioe1xuICAgICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcmVxdWVzdC5wYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgICAgYWxsb3dlZEVsZW1lbnRzOiByZXF1ZXN0LmFsbG93ZWRFbGVtZW50c1xuICAgICAgfSwgeyQsIGRvY3VtZW50LCB3aW5kb3d9KVxuICAgICAgd2luZG93LmNzID0gY29udGVudFNlbGVjdG9yXG5cbiAgICAgIHZhciBkZWZlcnJlZENTU1NlbGVjdG9yID0gY29udGVudFNlbGVjdG9yLmdldENTU1NlbGVjdG9yKClcbiAgICAgIGRlZmVycmVkQ1NTU2VsZWN0b3IuZG9uZShmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKCkuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgZGVmZXJyZWRSZXNwb25zZS5yZXNvbHZlKHJlc3BvbnNlKVxuICAgICAgICAgIHdpbmRvdy5jcyA9IHVuZGVmaW5lZFxuICAgICAgICB9KVxuICAgICAgfS5iaW5kKHRoaXMpKS5mYWlsKGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVqZWN0KG1lc3NhZ2UpXG4gICAgICAgIHdpbmRvdy5jcyA9IHVuZGVmaW5lZFxuICAgICAgfSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuXHQvKipcblx0ICogUHJldmlldyBlbGVtZW50c1xuXHQgKiBAcGFyYW0gcmVxdWVzdC5wYXJlbnRDU1NTZWxlY3RvclxuXHQgKiBAcGFyYW0gcmVxdWVzdC5lbGVtZW50Q1NTU2VsZWN0b3Jcblx0ICovXG4gIHByZXZpZXdTZWxlY3RvcjogZnVuY3Rpb24gKHJlcXVlc3QsIG9wdGlvbnMpIHtcbiAgICB2YXIgJCA9IG9wdGlvbnMuJFxuICAgIHZhciBkZWZlcnJlZFJlc3BvbnNlID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB0aGlzLnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKS5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBjb250ZW50U2VsZWN0b3IgPSBuZXcgQ29udGVudFNlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHJlcXVlc3QucGFyZW50Q1NTU2VsZWN0b3JcbiAgICAgIH0sIHskLCBkb2N1bWVudCwgd2luZG93fSlcbiAgICAgIHdpbmRvdy5jcyA9IGNvbnRlbnRTZWxlY3RvclxuXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSBjb250ZW50U2VsZWN0b3IucHJldmlld1NlbGVjdG9yKHJlcXVlc3QuZWxlbWVudENTU1NlbGVjdG9yKVxuICAgICAgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSgpXG4gICAgICB9KS5mYWlsKGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVqZWN0KG1lc3NhZ2UpXG4gICAgICAgIHdpbmRvdy5jcyA9IHVuZGVmaW5lZFxuICAgICAgfSlcbiAgICB9KVxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb250ZW50U2NyaXB0XG4iLCJ2YXIgRWxlbWVudFF1ZXJ5ID0gcmVxdWlyZSgnLi9FbGVtZW50UXVlcnknKVxudmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgQ3NzU2VsZWN0b3IgPSByZXF1aXJlKCdjc3Mtc2VsZWN0b3InKS5Dc3NTZWxlY3RvclxuLyoqXG4gKiBAcGFyYW0gb3B0aW9ucy5wYXJlbnRDU1NTZWxlY3Rvclx0RWxlbWVudHMgY2FuIGJlIG9ubHkgc2VsZWN0ZWQgd2l0aGluIHRoaXMgZWxlbWVudFxuICogQHBhcmFtIG9wdGlvbnMuYWxsb3dlZEVsZW1lbnRzXHRFbGVtZW50cyB0aGF0IGNhbiBvbmx5IGJlIHNlbGVjdGVkXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIENvbnRlbnRTZWxlY3RvciA9IGZ1bmN0aW9uIChvcHRpb25zLCBtb3JlT3B0aW9ucykge1xuXHQvLyBkZWZlcnJlZCByZXNwb25zZVxuICB0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgdGhpcy5hbGxvd2VkRWxlbWVudHMgPSBvcHRpb25zLmFsbG93ZWRFbGVtZW50c1xuICB0aGlzLnBhcmVudENTU1NlbGVjdG9yID0gb3B0aW9ucy5wYXJlbnRDU1NTZWxlY3Rvci50cmltKClcbiAgdGhpcy5hbGVydCA9IG9wdGlvbnMuYWxlcnQgfHwgZnVuY3Rpb24gKHR4dCkgeyBhbGVydCh0eHQpIH1cblxuICB0aGlzLiQgPSBtb3JlT3B0aW9ucy4kXG4gIHRoaXMuZG9jdW1lbnQgPSBtb3JlT3B0aW9ucy5kb2N1bWVudFxuICB0aGlzLndpbmRvdyA9IG1vcmVPcHRpb25zLndpbmRvd1xuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeSBpbiBjb250ZW50IHNlbGVjdG9yJylcbiAgaWYgKCF0aGlzLmRvY3VtZW50KSB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGRvY3VtZW50XCIpXG4gIGlmKCF0aGlzLndpbmRvdykgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB3aW5kb3dcIilcbiAgaWYgKHRoaXMucGFyZW50Q1NTU2VsZWN0b3IpIHtcbiAgICB0aGlzLnBhcmVudCA9IHRoaXMuJCh0aGlzLnBhcmVudENTU1NlbGVjdG9yKVswXVxuXG5cdFx0Ly8gIGhhbmRsZSBzaXR1YXRpb24gd2hlbiBwYXJlbnQgc2VsZWN0b3Igbm90IGZvdW5kXG4gICAgaWYgKHRoaXMucGFyZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnJlamVjdCgncGFyZW50IHNlbGVjdG9yIG5vdCBmb3VuZCcpXG4gICAgICB0aGlzLmFsZXJ0KCdQYXJlbnQgZWxlbWVudCBub3QgZm91bmQhJylcbiAgICB9XG4gIH1cdGVsc2Uge1xuICAgIHRoaXMucGFyZW50ID0gdGhpcy4kKCdib2R5JylbMF1cbiAgfVxufVxuXG5Db250ZW50U2VsZWN0b3IucHJvdG90eXBlID0ge1xuXG5cdC8qKlxuXHQgKiBnZXQgY3NzIHNlbGVjdG9yIHNlbGVjdGVkIGJ5IHRoZSB1c2VyXG5cdCAqL1xuICBnZXRDU1NTZWxlY3RvcjogZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgICBpZiAodGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2Uuc3RhdGUoKSAhPT0gJ3JlamVjdGVkJykge1xuXHRcdFx0Ly8gZWxlbWVudHMgdGhhdCBhcmUgc2VsZWN0ZWQgYnkgdGhlIHVzZXJcbiAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50cyA9IFtdXG5cdFx0XHQvLyBlbGVtZW50IHNlbGVjdGVkIGZyb20gdG9wXG4gICAgICB0aGlzLnRvcCA9IDBcblxuXHRcdFx0Ly8gaW5pdGlhbGl6ZSBjc3Mgc2VsZWN0b3JcbiAgICAgIHRoaXMuaW5pdENzc1NlbGVjdG9yKGZhbHNlKVxuXG4gICAgICB0aGlzLmluaXRHVUkoKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBnZXRDdXJyZW50Q1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5zZWxlY3RlZEVsZW1lbnRzICYmIHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgY3NzU2VsZWN0b3JcblxuXHRcdFx0Ly8gaGFuZGxlIHNwZWNpYWwgY2FzZSB3aGVuIHBhcmVudCBpcyBzZWxlY3RlZFxuICAgICAgaWYgKHRoaXMuaXNQYXJlbnRTZWxlY3RlZCgpKSB7XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkRWxlbWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgY3NzU2VsZWN0b3IgPSAnX3BhcmVudF8nXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgW25hbWU9ZGlmZXJlbnRFbGVtZW50U2VsZWN0aW9uXScpLnByb3AoJ2NoZWNrZWQnKSkge1xuICAgICAgICAgIHZhciBzZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5zZWxlY3RlZEVsZW1lbnRzLmNsb25lKClcbiAgICAgICAgICBzZWxlY3RlZEVsZW1lbnRzLnNwbGljZShzZWxlY3RlZEVsZW1lbnRzLmluZGV4T2YodGhpcy5wYXJlbnQpLCAxKVxuICAgICAgICAgIGNzc1NlbGVjdG9yID0gJ19wYXJlbnRfLCAnICsgdGhpcy5jc3NTZWxlY3Rvci5nZXRDc3NTZWxlY3RvcihzZWxlY3RlZEVsZW1lbnRzLCB0aGlzLnRvcClcbiAgICAgICAgfSBlbHNlIHtcblx0XHRcdFx0XHQvLyB3aWxsIHRyaWdnZXIgZXJyb3Igd2hlcmUgbXVsdGlwbGUgc2VsZWN0aW9ucyBhcmUgbm90IGFsbG93ZWRcbiAgICAgICAgICBjc3NTZWxlY3RvciA9IHRoaXMuY3NzU2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3IodGhpcy5zZWxlY3RlZEVsZW1lbnRzLCB0aGlzLnRvcClcbiAgICAgICAgfVxuICAgICAgfVx0XHRcdGVsc2Uge1xuICAgICAgICBjc3NTZWxlY3RvciA9IHRoaXMuY3NzU2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3IodGhpcy5zZWxlY3RlZEVsZW1lbnRzLCB0aGlzLnRvcClcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNzc1NlbGVjdG9yXG4gICAgfVxuICAgIHJldHVybiAnJ1xuICB9LFxuXG4gIGlzUGFyZW50U2VsZWN0ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RlZEVsZW1lbnRzLmluZGV4T2YodGhpcy5wYXJlbnQpICE9PSAtMVxuICB9LFxuXG5cdC8qKlxuXHQgKiBpbml0aWFsaXplIG9yIHJlY29uZmlndXJlIGNzcyBzZWxlY3RvciBjbGFzc1xuXHQgKiBAcGFyYW0gYWxsb3dNdWx0aXBsZVNlbGVjdG9yc1xuXHQgKi9cbiAgaW5pdENzc1NlbGVjdG9yOiBmdW5jdGlvbiAoYWxsb3dNdWx0aXBsZVNlbGVjdG9ycykge1xuICAgIHRoaXMuY3NzU2VsZWN0b3IgPSBuZXcgQ3NzU2VsZWN0b3Ioe1xuICAgICAgZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yOiB0cnVlLFxuICAgICAgcGFyZW50OiB0aGlzLnBhcmVudCxcbiAgICAgIGFsbG93TXVsdGlwbGVTZWxlY3RvcnM6IGFsbG93TXVsdGlwbGVTZWxlY3RvcnMsXG4gICAgICBpZ25vcmVkQ2xhc3NlczogW1xuICAgICAgICAnLXNpdGVtYXAtc2VsZWN0LWl0ZW0tc2VsZWN0ZWQnLFxuICAgICAgICAnLXNpdGVtYXAtc2VsZWN0LWl0ZW0taG92ZXInLFxuICAgICAgICAnLXNpdGVtYXAtcGFyZW50JyxcbiAgICAgICAgJy13ZWItc2NyYXBlci1pbWctb24tdG9wJyxcbiAgICAgICAgJy13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJ1xuICAgICAgXSxcbiAgICAgIHF1ZXJ5OiB0aGlzLiRcbiAgICB9KVxuICB9LFxuXG4gIHByZXZpZXdTZWxlY3RvcjogZnVuY3Rpb24gKGVsZW1lbnRDU1NTZWxlY3Rvcikge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxuICAgIHZhciB3aW5kb3cgPSB0aGlzLndpbmRvd1xuICAgIGlmICh0aGlzLmRlZmVycmVkQ1NTU2VsZWN0b3JSZXNwb25zZS5zdGF0ZSgpICE9PSAncmVqZWN0ZWQnKSB7XG4gICAgICB0aGlzLmhpZ2hsaWdodFBhcmVudCgpXG4gICAgICAkKEVsZW1lbnRRdWVyeShlbGVtZW50Q1NTU2VsZWN0b3IsIHRoaXMucGFyZW50LCB7JCwgZG9jdW1lbnQsIHdpbmRvd30pKS5hZGRDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0tc2VsZWN0ZWQnKVxuICAgICAgdGhpcy5kZWZlcnJlZENTU1NlbGVjdG9yUmVzcG9uc2UucmVzb2x2ZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGluaXRHVUk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG4gICAgdGhpcy5oaWdobGlnaHRQYXJlbnQoKVxuXG5cdFx0Ly8gYWxsIGVsZW1lbnRzIGV4Y2VwdCB0b29sYmFyXG4gICAgdGhpcy4kYWxsRWxlbWVudHMgPSB0aGlzLiQodGhpcy5hbGxvd2VkRWxlbWVudHMgKyAnOm5vdCgjLXNlbGVjdG9yLXRvb2xiYXIpOm5vdCgjLXNlbGVjdG9yLXRvb2xiYXIgKiknLCB0aGlzLnBhcmVudClcblx0XHQvLyBhbGxvdyBzZWxlY3RpbmcgcGFyZW50IGFsc29cbiAgICBpZiAodGhpcy5wYXJlbnQgIT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgIHRoaXMuJGFsbEVsZW1lbnRzLnB1c2godGhpcy5wYXJlbnQpXG4gICAgfVxuXG4gICAgdGhpcy5iaW5kRWxlbWVudEhpZ2hsaWdodCgpXG4gICAgdGhpcy5iaW5kRWxlbWVudFNlbGVjdGlvbigpXG4gICAgdGhpcy5iaW5kS2V5Ym9hcmRTZWxlY3Rpb25NYW5pcHVsYXRpb25zKClcbiAgICB0aGlzLmF0dGFjaFRvb2xiYXIoKVxuICAgIHRoaXMuYmluZE11bHRpcGxlR3JvdXBDaGVja2JveCgpXG4gICAgdGhpcy5iaW5kTXVsdGlwbGVHcm91cFBvcHVwSGlkZSgpXG4gICAgdGhpcy5iaW5kTW92ZUltYWdlc1RvVG9wKClcbiAgfSxcblxuICBiaW5kRWxlbWVudFNlbGVjdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJGFsbEVsZW1lbnRzLmJpbmQoJ2NsaWNrLmVsZW1lbnRTZWxlY3RvcicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICB2YXIgZWxlbWVudCA9IGUuY3VycmVudFRhcmdldFxuICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5pbmRleE9mKGVsZW1lbnQpID09PSAtMSkge1xuICAgICAgICB0aGlzLnNlbGVjdGVkRWxlbWVudHMucHVzaChlbGVtZW50KVxuICAgICAgfVxuICAgICAgdGhpcy5oaWdobGlnaHRTZWxlY3RlZEVsZW1lbnRzKClcblxuXHRcdFx0Ly8gQ2FuY2VsIGFsbCBvdGhlciBldmVudHNcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuXHQvKipcblx0ICogQWRkIHRvIHNlbGVjdCBlbGVtZW50cyB0aGUgZWxlbWVudCB0aGF0IGlzIHVuZGVyIHRoZSBtb3VzZVxuXHQgKi9cbiAgc2VsZWN0TW91c2VPdmVyRWxlbWVudDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcy5tb3VzZU92ZXJFbGVtZW50XG4gICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50cy5wdXNoKGVsZW1lbnQpXG4gICAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGVkRWxlbWVudHMoKVxuICAgIH1cbiAgfSxcblxuICBiaW5kRWxlbWVudEhpZ2hsaWdodDogZnVuY3Rpb24gKCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgJCh0aGlzLiRhbGxFbGVtZW50cykuYmluZCgnbW91c2VvdmVyLmVsZW1lbnRTZWxlY3RvcicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICB2YXIgZWxlbWVudCA9IGUuY3VycmVudFRhcmdldFxuICAgICAgdGhpcy5tb3VzZU92ZXJFbGVtZW50ID0gZWxlbWVudFxuICAgICAgJChlbGVtZW50KS5hZGRDbGFzcygnLXNpdGVtYXAtc2VsZWN0LWl0ZW0taG92ZXInKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfS5iaW5kKHRoaXMpKS5iaW5kKCdtb3VzZW91dC5lbGVtZW50U2VsZWN0b3InLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdmFyIGVsZW1lbnQgPSBlLmN1cnJlbnRUYXJnZXRcbiAgICAgIHRoaXMubW91c2VPdmVyRWxlbWVudCA9IG51bGxcbiAgICAgICQoZWxlbWVudCkucmVtb3ZlQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLWhvdmVyJylcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBiaW5kTW92ZUltYWdlc1RvVG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICAkKCdib2R5JykuYWRkQ2xhc3MoJy13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJylcblxuXHRcdC8vIGRvIHRoaXMgb25seSB3aGVuIHNlbGVjdGluZyBpbWFnZXNcbiAgICBpZiAodGhpcy5hbGxvd2VkRWxlbWVudHMgPT09ICdpbWcnKSB7XG4gICAgICAkKCdpbWcnKS5maWx0ZXIoZnVuY3Rpb24gKGksIGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuICQoZWxlbWVudCkuY3NzKCdwb3NpdGlvbicpID09PSAnc3RhdGljJ1xuICAgICAgfSkuYWRkQ2xhc3MoJy13ZWItc2NyYXBlci1pbWctb24tdG9wJylcbiAgICB9XG4gIH0sXG5cbiAgdW5iaW5kTW92ZUltYWdlc1RvVG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCdib2R5Li13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJykucmVtb3ZlQ2xhc3MoJy13ZWItc2NyYXBlci1zZWxlY3Rpb24tYWN0aXZlJylcbiAgICB0aGlzLiQoJ2ltZy4td2ViLXNjcmFwZXItaW1nLW9uLXRvcCcpLnJlbW92ZUNsYXNzKCctd2ViLXNjcmFwZXItaW1nLW9uLXRvcCcpXG4gIH0sXG5cbiAgc2VsZWN0Q2hpbGQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnRvcC0tXG4gICAgaWYgKHRoaXMudG9wIDwgMCkge1xuICAgICAgdGhpcy50b3AgPSAwXG4gICAgfVxuICB9LFxuICBzZWxlY3RQYXJlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnRvcCsrXG4gIH0sXG5cblx0Ly8gVXNlciB3aXRoIGtleWJvYXJkIGFycm93cyBjYW4gc2VsZWN0IGNoaWxkIG9yIHBhcmV0IGVsZW1lbnRzIG9mIHNlbGVjdGVkIGVsZW1lbnRzLlxuICBiaW5kS2V5Ym9hcmRTZWxlY3Rpb25NYW5pcHVsYXRpb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG5cdFx0Ly8gY2hlY2sgZm9yIGZvY3VzXG4gICAgdmFyIGxhc3RGb2N1c1N0YXR1c1xuICAgIHRoaXMua2V5UHJlc3NGb2N1c0ludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGZvY3VzID0gZG9jdW1lbnQuaGFzRm9jdXMoKVxuICAgICAgaWYgKGZvY3VzID09PSBsYXN0Rm9jdXNTdGF0dXMpIHJldHVyblxuICAgICAgbGFzdEZvY3VzU3RhdHVzID0gZm9jdXNcblxuICAgICAgJCgnIy1zZWxlY3Rvci10b29sYmFyIC5rZXktYnV0dG9uJykudG9nZ2xlQ2xhc3MoJ2hpZGUnLCAhZm9jdXMpXG4gICAgICAkKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1ldmVudHMnKS50b2dnbGVDbGFzcygnaGlkZScsIGZvY3VzKVxuICAgIH0sIDIwMClcblxuXHRcdC8vIFVzaW5nIHVwL2Rvd24gYXJyb3dzIHVzZXIgY2FuIHNlbGVjdCBlbGVtZW50cyBmcm9tIHRvcCBvZiB0aGVcblx0XHQvLyBzZWxlY3RlZCBlbGVtZW50XG4gICAgJChkb2N1bWVudCkuYmluZCgna2V5ZG93bi5zZWxlY3Rpb25NYW5pcHVsYXRpb24nLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdC8vIHNlbGVjdCBjaGlsZCBDXG4gICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gNjcpIHtcbiAgICAgICAgdGhpcy5hbmltYXRlQ2xpY2tlZEtleSgkKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24tY2hpbGQnKSlcbiAgICAgICAgdGhpcy5zZWxlY3RDaGlsZCgpXG4gICAgICB9XG5cdFx0XHQvLyBzZWxlY3QgcGFyZW50IFBcbiAgICAgIGVsc2UgaWYgKGV2ZW50LmtleUNvZGUgPT09IDgwKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUNsaWNrZWRLZXkoJCgnIy1zZWxlY3Rvci10b29sYmFyIC5rZXktYnV0dG9uLXBhcmVudCcpKVxuICAgICAgICB0aGlzLnNlbGVjdFBhcmVudCgpXG4gICAgICB9XG5cdFx0XHQvLyBzZWxlY3QgZWxlbWVudFxuICAgICAgZWxzZSBpZiAoZXZlbnQua2V5Q29kZSA9PT0gODMpIHtcbiAgICAgICAgdGhpcy5hbmltYXRlQ2xpY2tlZEtleSgkKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmtleS1idXR0b24tc2VsZWN0JykpXG4gICAgICAgIHRoaXMuc2VsZWN0TW91c2VPdmVyRWxlbWVudCgpXG4gICAgICB9XG5cbiAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0ZWRFbGVtZW50cygpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGFuaW1hdGVDbGlja2VkS2V5OiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgJChlbGVtZW50KS5yZW1vdmVDbGFzcygnY2xpY2tlZCcpLnJlbW92ZUNsYXNzKCdjbGlja2VkLWFuaW1hdGlvbicpXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAkKGVsZW1lbnQpLmFkZENsYXNzKCdjbGlja2VkJylcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGVsZW1lbnQpLmFkZENsYXNzKCdjbGlja2VkLWFuaW1hdGlvbicpXG4gICAgICB9LCAxMDApXG4gICAgfSwgMSlcbiAgfSxcblxuICBoaWdobGlnaHRTZWxlY3RlZEVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG4gICAgdmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gICAgdHJ5IHtcbiAgICAgIHZhciByZXN1bHRDc3NTZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudENTU1NlbGVjdG9yKClcblxuICAgICAgJCgnYm9keSAjLXNlbGVjdG9yLXRvb2xiYXIgLnNlbGVjdG9yJykudGV4dChyZXN1bHRDc3NTZWxlY3Rvcilcblx0XHRcdC8vIGhpZ2hsaWdodCBzZWxlY3RlZCBlbGVtZW50c1xuICAgICAgJCgnLi1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJykucmVtb3ZlQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJylcbiAgICAgICQoRWxlbWVudFF1ZXJ5KHJlc3VsdENzc1NlbGVjdG9yLCB0aGlzLnBhcmVudCwgeyQsIGRvY3VtZW50LCB3aW5kb3d9KSkuYWRkQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJylcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChlcnIgPT09ICdmb3VuZCBtdWx0aXBsZSBlbGVtZW50IGdyb3VwcywgYnV0IGFsbG93TXVsdGlwbGVTZWxlY3RvcnMgZGlzYWJsZWQnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdtdWx0aXBsZSBkaWZmZXJlbnQgZWxlbWVudCBzZWxlY3Rpb24gZGlzYWJsZWQnKVxuXG4gICAgICAgIHRoaXMuc2hvd011bHRpcGxlR3JvdXBQb3B1cCgpXG5cdFx0XHRcdC8vIHJlbW92ZSBsYXN0IGFkZGVkIGVsZW1lbnRcbiAgICAgICAgdGhpcy5zZWxlY3RlZEVsZW1lbnRzLnBvcCgpXG4gICAgICAgIHRoaXMuaGlnaGxpZ2h0U2VsZWN0ZWRFbGVtZW50cygpXG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHNob3dNdWx0aXBsZUdyb3VwUG9wdXA6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciAucG9wb3ZlcicpLmF0dHIoJ3N0eWxlJywgJ2Rpc3BsYXk6YmxvY2sgIWltcG9ydGFudDsnKVxuICB9LFxuXG4gIGhpZGVNdWx0aXBsZUdyb3VwUG9wdXA6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciAucG9wb3ZlcicpLmF0dHIoJ3N0eWxlJywgJycpXG4gIH0sXG5cbiAgYmluZE11bHRpcGxlR3JvdXBQb3B1cEhpZGU6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhciAucG9wb3ZlciAuY2xvc2UnKS5jbGljayh0aGlzLmhpZGVNdWx0aXBsZUdyb3VwUG9wdXAuYmluZCh0aGlzKSlcbiAgfSxcblxuICB1bmJpbmRNdWx0aXBsZUdyb3VwUG9wdXBIaWRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLnBvcG92ZXIgLmNsb3NlJykudW5iaW5kKCdjbGljaycpXG4gIH0sXG5cbiAgYmluZE11bHRpcGxlR3JvdXBDaGVja2JveDogZnVuY3Rpb24gKCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgJCgnIy1zZWxlY3Rvci10b29sYmFyIFtuYW1lPWRpZmVyZW50RWxlbWVudFNlbGVjdGlvbl0nKS5jaGFuZ2UoZnVuY3Rpb24gKGUpIHtcbiAgICAgIGlmICgkKGUuY3VycmVudFRhcmdldCkuaXMoJzpjaGVja2VkJykpIHtcbiAgICAgICAgdGhpcy5pbml0Q3NzU2VsZWN0b3IodHJ1ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaW5pdENzc1NlbGVjdG9yKGZhbHNlKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcbiAgdW5iaW5kTXVsdGlwbGVHcm91cENoZWNrYm94OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjLXNlbGVjdG9yLXRvb2xiYXIgLmRpZmVyZW50RWxlbWVudFNlbGVjdGlvbicpLnVuYmluZCgnY2hhbmdlJylcbiAgfSxcblxuICBhdHRhY2hUb29sYmFyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgJHRvb2xiYXIgPSAnPGRpdiBpZD1cIi1zZWxlY3Rvci10b29sYmFyXCI+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImxpc3QtaXRlbVwiPjxkaXYgY2xhc3M9XCJzZWxlY3Rvci1jb250YWluZXJcIj48ZGl2IGNsYXNzPVwic2VsZWN0b3JcIj48L2Rpdj48L2Rpdj48L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwiaW5wdXQtZ3JvdXAtYWRkb24gbGlzdC1pdGVtXCI+JyArXG5cdFx0XHRcdCc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgdGl0bGU9XCJFbmFibGUgZGlmZmVyZW50IHR5cGUgZWxlbWVudCBzZWxlY3Rpb25cIiBuYW1lPVwiZGlmZXJlbnRFbGVtZW50U2VsZWN0aW9uXCI+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwicG9wb3ZlciB0b3BcIj4nICtcblx0XHRcdFx0JzxkaXYgY2xhc3M9XCJjbG9zZVwiPsOXPC9kaXY+JyArXG5cdFx0XHRcdCc8ZGl2IGNsYXNzPVwiYXJyb3dcIj48L2Rpdj4nICtcblx0XHRcdFx0JzxkaXYgY2xhc3M9XCJwb3BvdmVyLWNvbnRlbnRcIj4nICtcblx0XHRcdFx0JzxkaXYgY2xhc3M9XCJ0eHRcIj4nICtcblx0XHRcdFx0J0RpZmZlcmVudCB0eXBlIGVsZW1lbnQgc2VsZWN0aW9uIGlzIGRpc2FibGVkLiBJZiB0aGUgZWxlbWVudCAnICtcblx0XHRcdFx0J3lvdSBjbGlja2VkIHNob3VsZCBhbHNvIGJlIGluY2x1ZGVkIHRoZW4gZW5hYmxlIHRoaXMgYW5kICcgK1xuXHRcdFx0XHQnY2xpY2sgb24gdGhlIGVsZW1lbnQgYWdhaW4uIFVzdWFsbHkgdGhpcyBpcyBub3QgbmVlZGVkLicgK1xuXHRcdFx0XHQnPC9kaXY+JyArXG5cdFx0XHRcdCc8L2Rpdj4nICtcblx0XHRcdFx0JzwvZGl2PicgK1xuXHRcdFx0JzwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0ga2V5LWV2ZW50c1wiPjxkaXYgdGl0bGU9XCJDbGljayBoZXJlIHRvIGVuYWJsZSBrZXkgcHJlc3MgZXZlbnRzIGZvciBzZWxlY3Rpb25cIj5FbmFibGUga2V5IGV2ZW50czwvZGl2PjwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0ga2V5LWJ1dHRvbiBrZXktYnV0dG9uLXNlbGVjdCBoaWRlXCIgdGl0bGU9XCJVc2UgUyBrZXkgdG8gc2VsZWN0IGVsZW1lbnRcIj5TPC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImxpc3QtaXRlbSBrZXktYnV0dG9uIGtleS1idXR0b24tcGFyZW50IGhpZGVcIiB0aXRsZT1cIlVzZSBQIGtleSB0byBzZWxlY3QgcGFyZW50XCI+UDwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJsaXN0LWl0ZW0ga2V5LWJ1dHRvbiBrZXktYnV0dG9uLWNoaWxkIGhpZGVcIiB0aXRsZT1cIlVzZSBDIGtleSB0byBzZWxlY3QgY2hpbGRcIj5DPC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImxpc3QtaXRlbSBkb25lLXNlbGVjdGluZy1idXR0b25cIj5Eb25lIHNlbGVjdGluZyE8L2Rpdj4nICtcblx0XHRcdCc8L2Rpdj4nXG4gICAgJCgnYm9keScpLmFwcGVuZCgkdG9vbGJhcilcblxuICAgICQoJ2JvZHkgIy1zZWxlY3Rvci10b29sYmFyIC5kb25lLXNlbGVjdGluZy1idXR0b24nKS5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnNlbGVjdGlvbkZpbmlzaGVkKClcbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG4gIGhpZ2hsaWdodFBhcmVudDogZnVuY3Rpb24gKCkge1xuICAgIHZhciAkID0gdGhpcy4kXG5cdFx0Ly8gZG8gbm90IGhpZ2hsaWdodCBwYXJlbnQgaWYgaXRzIHRoZSBib2R5XG4gICAgaWYgKCEkKHRoaXMucGFyZW50KS5pcygnYm9keScpICYmICEkKHRoaXMucGFyZW50KS5pcygnI3dlYnBhZ2UnKSkge1xuICAgICAgJCh0aGlzLnBhcmVudCkuYWRkQ2xhc3MoJy1zaXRlbWFwLXBhcmVudCcpXG4gICAgfVxuICB9LFxuXG4gIHVuYmluZEVsZW1lbnRTZWxlY3Rpb246IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgICQodGhpcy4kYWxsRWxlbWVudHMpLnVuYmluZCgnY2xpY2suZWxlbWVudFNlbGVjdG9yJylcblx0XHQvLyByZW1vdmUgaGlnaGxpZ2h0ZWQgZWxlbWVudCBjbGFzc2VzXG4gICAgdGhpcy51bmJpbmRFbGVtZW50U2VsZWN0aW9uSGlnaGxpZ2h0KClcbiAgfSxcbiAgdW5iaW5kRWxlbWVudFNlbGVjdGlvbkhpZ2hsaWdodDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnLi1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJykucmVtb3ZlQ2xhc3MoJy1zaXRlbWFwLXNlbGVjdC1pdGVtLXNlbGVjdGVkJylcbiAgICB0aGlzLiQoJy4tc2l0ZW1hcC1wYXJlbnQnKS5yZW1vdmVDbGFzcygnLXNpdGVtYXAtcGFyZW50JylcbiAgfSxcbiAgdW5iaW5kRWxlbWVudEhpZ2hsaWdodDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCh0aGlzLiRhbGxFbGVtZW50cykudW5iaW5kKCdtb3VzZW92ZXIuZWxlbWVudFNlbGVjdG9yJylcblx0XHRcdC51bmJpbmQoJ21vdXNlb3V0LmVsZW1lbnRTZWxlY3RvcicpXG4gIH0sXG4gIHVuYmluZEtleWJvYXJkU2VsZWN0aW9uTWFpcHVsYXRpb3M6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoZG9jdW1lbnQpLnVuYmluZCgna2V5ZG93bi5zZWxlY3Rpb25NYW5pcHVsYXRpb24nKVxuICAgIGNsZWFySW50ZXJ2YWwodGhpcy5rZXlQcmVzc0ZvY3VzSW50ZXJ2YWwpXG4gIH0sXG4gIHJlbW92ZVRvb2xiYXI6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJ2JvZHkgIy1zZWxlY3Rvci10b29sYmFyIGEnKS51bmJpbmQoJ2NsaWNrJylcbiAgICB0aGlzLiQoJyMtc2VsZWN0b3ItdG9vbGJhcicpLnJlbW92ZSgpXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJlbW92ZSB0b29sYmFyIGFuZCB1bmJpbmQgZXZlbnRzXG5cdCAqL1xuICByZW1vdmVHVUk6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnVuYmluZEVsZW1lbnRTZWxlY3Rpb24oKVxuICAgIHRoaXMudW5iaW5kRWxlbWVudEhpZ2hsaWdodCgpXG4gICAgdGhpcy51bmJpbmRLZXlib2FyZFNlbGVjdGlvbk1haXB1bGF0aW9zKClcbiAgICB0aGlzLnVuYmluZE11bHRpcGxlR3JvdXBQb3B1cEhpZGUoKVxuICAgIHRoaXMudW5iaW5kTXVsdGlwbGVHcm91cENoZWNrYm94KClcbiAgICB0aGlzLnVuYmluZE1vdmVJbWFnZXNUb1RvcCgpXG4gICAgdGhpcy5yZW1vdmVUb29sYmFyKClcbiAgfSxcblxuICBzZWxlY3Rpb25GaW5pc2hlZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXN1bHRDc3NTZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudENTU1NlbGVjdG9yKClcblxuICAgIHRoaXMuZGVmZXJyZWRDU1NTZWxlY3RvclJlc3BvbnNlLnJlc29sdmUoe1xuICAgICAgQ1NTU2VsZWN0b3I6IHJlc3VsdENzc1NlbGVjdG9yXG4gICAgfSlcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRlbnRTZWxlY3RvclxuIiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vU2VsZWN0b3JzJylcbnZhciBTZWxlY3RvciA9IHJlcXVpcmUoJy4vU2VsZWN0b3InKVxudmFyIFNlbGVjdG9yVGFibGUgPSBzZWxlY3RvcnMuU2VsZWN0b3JUYWJsZVxudmFyIFNpdGVtYXAgPSByZXF1aXJlKCcuL1NpdGVtYXAnKVxuLy8gdmFyIFNlbGVjdG9yR3JhcGh2MiA9IHJlcXVpcmUoJy4vU2VsZWN0b3JHcmFwaHYyJylcbnZhciBnZXRCYWNrZ3JvdW5kU2NyaXB0ID0gcmVxdWlyZSgnLi9nZXRCYWNrZ3JvdW5kU2NyaXB0JylcbnZhciBnZXRDb250ZW50U2NyaXB0ID0gcmVxdWlyZSgnLi9nZXRDb250ZW50U2NyaXB0JylcbnZhciBTaXRlbWFwQ29udHJvbGxlciA9IGZ1bmN0aW9uIChvcHRpb25zLCBtb3JlT3B0aW9ucykge1xuICB0aGlzLiQgPSBtb3JlT3B0aW9ucy4kXG4gIHRoaXMuZG9jdW1lbnQgPSBtb3JlT3B0aW9ucy5kb2N1bWVudFxuICB0aGlzLndpbmRvdyA9IG1vcmVPcHRpb25zLndpbmRvd1xuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeSBpbiBDb250cm9sbGVyJylcbiAgaWYgKCF0aGlzLmRvY3VtZW50KSB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGRvY3VtZW50XCIpXG4gIGlmKCF0aGlzLndpbmRvdyl0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHdpbmRvd1wiKVxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICB0aGlzW2ldID0gb3B0aW9uc1tpXVxuICB9XG4gIHRoaXMuaW5pdCgpXG59XG5cblNpdGVtYXBDb250cm9sbGVyLnByb3RvdHlwZSA9IHtcblxuICBiYWNrZ3JvdW5kU2NyaXB0OiBnZXRCYWNrZ3JvdW5kU2NyaXB0KCdEZXZUb29scycpLFxuICBjb250ZW50U2NyaXB0OiBnZXRDb250ZW50U2NyaXB0KCdEZXZUb29scycpLFxuXG4gIGNvbnRyb2w6IGZ1bmN0aW9uIChjb250cm9scykge1xuICAgIHZhciBjb250cm9sbGVyID0gdGhpc1xuXG4gICAgZm9yICh2YXIgc2VsZWN0b3IgaW4gY29udHJvbHMpIHtcbiAgICAgIGZvciAodmFyIGV2ZW50IGluIGNvbnRyb2xzW3NlbGVjdG9yXSkge1xuICAgICAgICB0aGlzLiQoZG9jdW1lbnQpLm9uKGV2ZW50LCBzZWxlY3RvciwgKGZ1bmN0aW9uIChzZWxlY3RvciwgZXZlbnQpIHtcbiAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbnRpbnVlQnViYmxpbmcgPSBjb250cm9sc1tzZWxlY3Rvcl1bZXZlbnRdLmNhbGwoY29udHJvbGxlciwgdGhpcylcbiAgICAgICAgICAgIGlmIChjb250aW51ZUJ1YmJsaW5nICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSkoc2VsZWN0b3IsIGV2ZW50KSlcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIExvYWRzIHRlbXBsYXRlcyBmb3IgSUNhbkhhelxuXHQgKi9cbiAgbG9hZFRlbXBsYXRlczogZnVuY3Rpb24gKGNiQWxsVGVtcGxhdGVzTG9hZGVkKSB7XG4gICAgdmFyIHRlbXBsYXRlSWRzID0gW1xuICAgICAgJ1ZpZXdwb3J0JyxcbiAgICAgICdTaXRlbWFwTGlzdCcsXG4gICAgICAnU2l0ZW1hcExpc3RJdGVtJyxcbiAgICAgICdTaXRlbWFwQ3JlYXRlJyxcbiAgICAgICdTaXRlbWFwU3RhcnRVcmxGaWVsZCcsXG4gICAgICAnU2l0ZW1hcEltcG9ydCcsXG4gICAgICAnU2l0ZW1hcEV4cG9ydCcsXG4gICAgICAnU2l0ZW1hcEJyb3dzZURhdGEnLFxuICAgICAgJ1NpdGVtYXBIZWFkbGVzc1NjcmFwZUNvbmZpZycsXG4gICAgICAnU2l0ZW1hcFNjcmFwZUNvbmZpZycsXG4gICAgICAnU2l0ZW1hcEV4cG9ydERhdGFDU1YnLFxuICAgICAgJ1NpdGVtYXBFZGl0TWV0YWRhdGEnLFxuICAgICAgJ1NlbGVjdG9yTGlzdCcsXG4gICAgICAnU2VsZWN0b3JMaXN0SXRlbScsXG4gICAgICAnU2VsZWN0b3JFZGl0JyxcbiAgICAgICdTZWxlY3RvckVkaXRUYWJsZUNvbHVtbicsXG4gICAgICAvLyAnU2l0ZW1hcFNlbGVjdG9yR3JhcGgnLFxuICAgICAgJ0RhdGFQcmV2aWV3J1xuICAgIF1cbiAgICB2YXIgdGVtcGxhdGVzTG9hZGVkID0gMFxuICAgIHZhciBjYkxvYWRlZCA9IGZ1bmN0aW9uICh0ZW1wbGF0ZUlkLCB0ZW1wbGF0ZSkge1xuICAgICAgdGVtcGxhdGVzTG9hZGVkKytcbiAgICAgIGljaC5hZGRUZW1wbGF0ZSh0ZW1wbGF0ZUlkLCB0ZW1wbGF0ZSlcbiAgICAgIGlmICh0ZW1wbGF0ZXNMb2FkZWQgPT09IHRlbXBsYXRlSWRzLmxlbmd0aCkge1xuICAgICAgICBjYkFsbFRlbXBsYXRlc0xvYWRlZCgpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGVtcGxhdGVJZHMuZm9yRWFjaChmdW5jdGlvbiAodGVtcGxhdGVJZCkge1xuICAgICAgdGhpcy4kLmdldCh0aGlzLnRlbXBsYXRlRGlyICsgdGVtcGxhdGVJZCArICcuaHRtbCcsIGNiTG9hZGVkLmJpbmQodGhpcywgdGVtcGxhdGVJZCkpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmxvYWRUZW1wbGF0ZXMoZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly8gY3VycmVudGx5IHZpZXdlZCBvYmplY3RzXG4gICAgICB0aGlzLmNsZWFyU3RhdGUoKVxuXG5cdFx0XHQvLyByZW5kZXIgbWFpbiB2aWV3cG9ydFxuICAgICAgaWNoLlZpZXdwb3J0KCkuYXBwZW5kVG8oJ2JvZHknKVxuXG5cdFx0XHQvLyBjYW5jZWwgYWxsIGZvcm0gc3VibWl0c1xuICAgICAgdGhpcy4kKCdmb3JtJykuYmluZCgnc3VibWl0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH0pXG5cbiAgICAgIHRoaXMuY29udHJvbCh7XG4gICAgICAgICcjc2l0ZW1hcHMtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaG93U2l0ZW1hcHNcbiAgICAgICAgfSxcbiAgICAgICAgJyNjcmVhdGUtc2l0ZW1hcC1jcmVhdGUtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaG93Q3JlYXRlU2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI2NyZWF0ZS1zaXRlbWFwLWltcG9ydC1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dJbXBvcnRTaXRlbWFwUGFuZWxcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwLWV4cG9ydC1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTaXRlbWFwRXhwb3J0UGFuZWxcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwLWV4cG9ydC1kYXRhLWNzdi1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTaXRlbWFwRXhwb3J0RGF0YUNzdlBhbmVsXG4gICAgICAgIH0sXG4gICAgICAgICcjc3VibWl0LWNyZWF0ZS1zaXRlbWFwJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmNyZWF0ZVNpdGVtYXBcbiAgICAgICAgfSxcbiAgICAgICAgJyNzdWJtaXQtaW1wb3J0LXNpdGVtYXAnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuaW1wb3J0U2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXAtZWRpdC1tZXRhZGF0YS1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmVkaXRTaXRlbWFwTWV0YWRhdGFcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwLXNlbGVjdG9yLWxpc3QtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdFxuICAgICAgICB9LCAvKiwgICAgICAgICcjc2l0ZW1hcC1zZWxlY3Rvci1ncmFwaC1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JHcmFwaFxuICAgICAgICB9ICovXG4gICAgICAgICcjc2l0ZW1hcC1icm93c2UtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5icm93c2VTaXRlbWFwRGF0YVxuICAgICAgICB9LFxuICAgICAgICAnYnV0dG9uI3N1Ym1pdC1lZGl0LXNpdGVtYXAnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZWRpdFNpdGVtYXBNZXRhZGF0YVNhdmVcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNpdGVtYXAtbWV0YWRhdGEtZm9ybSc6IHtcbiAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlIH1cbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwcyB0cic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5lZGl0U2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI3NpdGVtYXBzIGJ1dHRvblthY3Rpb249ZGVsZXRlLXNpdGVtYXBdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmRlbGV0ZVNpdGVtYXBcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwLXNjcmFwZS1uYXYtYnV0dG9uJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNob3dTY3JhcGVTaXRlbWFwQ29uZmlnUGFuZWxcblxuXG4gICAgICAgIH0sXG4gICAgICAgICcjc2l0ZW1hcC1oZWFkbGVzcy1zY3JhcGUtbmF2LWJ1dHRvbic6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zaG93SGVhZGxlc3NTY3JhcGVTaXRlbWFwQ29uZmlnUGFuZWxcbiAgICAgICAgfSxcbiAgICAgICAgJyNzdWJtaXQtc2NyYXBlLXNpdGVtYXAtZm9ybSc6IHtcbiAgICAgICAgICBzdWJtaXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlIH1cbiAgICAgICAgfSxcbiAgICAgICAgJyNzdWJtaXQtc2NyYXBlLXNpdGVtYXAnOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2NyYXBlU2l0ZW1hcFxuICAgICAgICB9LFxuICAgICAgICAnI3N1Ym1pdC1oZWFkbGVzcy1zY3JhcGUtc2l0ZW1hcCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5oZWFkbGVzc1NjcmFwZVNpdGVtYXBcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwcyBidXR0b25bYWN0aW9uPWJyb3dzZS1zaXRlbWFwLWRhdGFdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNpdGVtYXBMaXN0QnJvd3NlU2l0ZW1hcERhdGFcbiAgICAgICAgfSxcbiAgICAgICAgJyNzaXRlbWFwcyBidXR0b25bYWN0aW9uPWNzdi1kb3dubG9hZC1zaXRlbWFwLWRhdGFdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmRvd25sb2FkU2l0ZW1hcERhdGFcbiAgICAgICAgfSxcblx0XHRcdFx0Ly8gQFRPRE8gbW92ZSB0byB0clxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgdGJvZHkgdHInOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2hvd0NoaWxkU2VsZWN0b3JzXG4gICAgICAgIH0sXG4gICAgICAgICcjc2VsZWN0b3ItdHJlZSAuYnJlYWRjcnVtYiBhJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnRyZWVOYXZpZ2F0aW9uc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3RcbiAgICAgICAgfSxcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIHRyIGJ1dHRvblthY3Rpb249ZWRpdC1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZWRpdFNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBzZWxlY3RbbmFtZT10eXBlXSc6IHtcbiAgICAgICAgICBjaGFuZ2U6IHRoaXMuc2VsZWN0b3JUeXBlQ2hhbmdlZFxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1zYXZlLXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zYXZlU2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249Y2FuY2VsLXNlbGVjdG9yLWVkaXRpbmddJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmNhbmNlbFNlbGVjdG9yRWRpdGluZ1xuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgI3NlbGVjdG9ySWQnOiB7XG4gICAgICAgICAga2V5dXA6IHRoaXMudXBkYXRlU2VsZWN0b3JQYXJlbnRMaXN0T25JZENoYW5nZVxuICAgICAgICB9LFxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgYnV0dG9uW2FjdGlvbj1hZGQtc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmFkZFNlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjc2VsZWN0b3ItdHJlZSB0ciBidXR0b25bYWN0aW9uPWRlbGV0ZS1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuZGVsZXRlU2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNzZWxlY3Rvci10cmVlIHRyIGJ1dHRvblthY3Rpb249cHJldmlldy1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucHJldmlld1NlbGVjdG9yRnJvbVNlbGVjdG9yVHJlZVxuICAgICAgICB9LFxuICAgICAgICAnI3NlbGVjdG9yLXRyZWUgdHIgYnV0dG9uW2FjdGlvbj1kYXRhLXByZXZpZXctc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnByZXZpZXdTZWxlY3RvckRhdGFGcm9tU2VsZWN0b3JUcmVlXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXNlbGVjdC1zZWxlY3Rvcl0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMuc2VsZWN0U2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249c2VsZWN0LXRhYmxlLWhlYWRlci1yb3ctc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnNlbGVjdFRhYmxlSGVhZGVyUm93U2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249c2VsZWN0LXRhYmxlLWRhdGEtcm93LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5zZWxlY3RUYWJsZURhdGFSb3dTZWxlY3RvclxuICAgICAgICB9LFxuICAgICAgICAnI2VkaXQtc2VsZWN0b3IgYnV0dG9uW2FjdGlvbj1wcmV2aWV3LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5wcmV2aWV3U2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249cHJldmlldy1jbGljay1lbGVtZW50LXNlbGVjdG9yXSc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5wcmV2aWV3Q2xpY2tFbGVtZW50U2VsZWN0b3JcbiAgICAgICAgfSxcbiAgICAgICAgJyNlZGl0LXNlbGVjdG9yIGJ1dHRvblthY3Rpb249cHJldmlldy10YWJsZS1yb3ctc2VsZWN0b3JdJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLnByZXZpZXdUYWJsZVJvd1NlbGVjdG9yXG4gICAgICAgIH0sXG4gICAgICAgICcjZWRpdC1zZWxlY3RvciBidXR0b25bYWN0aW9uPXByZXZpZXctc2VsZWN0b3ItZGF0YV0nOiB7XG4gICAgICAgICAgY2xpY2s6IHRoaXMucHJldmlld1NlbGVjdG9yRGF0YUZyb21TZWxlY3RvckVkaXRpbmdcbiAgICAgICAgfSxcbiAgICAgICAgJ2J1dHRvbi5hZGQtZXh0cmEtc3RhcnQtdXJsJzoge1xuICAgICAgICAgIGNsaWNrOiB0aGlzLmFkZFN0YXJ0VXJsXG4gICAgICAgIH0sXG4gICAgICAgICdidXR0b24ucmVtb3ZlLXN0YXJ0LXVybCc6IHtcbiAgICAgICAgICBjbGljazogdGhpcy5yZW1vdmVTdGFydFVybFxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgdGhpcy5zaG93U2l0ZW1hcHMoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBjbGVhclN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zdGF0ZSA9IHtcblx0XHRcdC8vIHNpdGVtYXAgdGhhdCBpcyBjdXJyZW50bHkgb3BlblxuICAgICAgY3VycmVudFNpdGVtYXA6IG51bGwsXG5cdFx0XHQvLyBzZWxlY3RvciBpZHMgdGhhdCBhcmUgc2hvd24gaW4gdGhlIG5hdmlnYXRpb25cbiAgICAgIGVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9yczogbnVsbCxcbiAgICAgIGN1cnJlbnRQYXJlbnRTZWxlY3RvcklkOiBudWxsLFxuICAgICAgY3VycmVudFNlbGVjdG9yOiBudWxsXG4gICAgfVxuICB9LFxuXG4gIHNldFN0YXRlRWRpdFNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwKSB7XG4gICAgdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcCA9IHNpdGVtYXBcbiAgICB0aGlzLnN0YXRlLmVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9ycyA9IFtcblx0XHRcdHtpZDogJ19yb290J31cbiAgICBdXG4gICAgdGhpcy5zdGF0ZS5jdXJyZW50UGFyZW50U2VsZWN0b3JJZCA9ICdfcm9vdCdcbiAgfSxcblxuICBzZXRBY3RpdmVOYXZpZ2F0aW9uQnV0dG9uOiBmdW5jdGlvbiAobmF2aWdhdGlvbklkKSB7XG4gICAgdGhpcy4kKCcubmF2IC5hY3RpdmUnKS5yZW1vdmVDbGFzcygnYWN0aXZlJylcbiAgICB0aGlzLiQoJyMnICsgbmF2aWdhdGlvbklkICsgJy1uYXYtYnV0dG9uJykuY2xvc2VzdCgnbGknKS5hZGRDbGFzcygnYWN0aXZlJylcblxuICAgIGlmIChuYXZpZ2F0aW9uSWQubWF0Y2goL15zaXRlbWFwLS8pKSB7XG4gICAgICB0aGlzLiQoJyNzaXRlbWFwLW5hdi1idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgdGhpcy4kKCcjc2l0ZW1hcC1uYXYtYnV0dG9uJykuY2xvc2VzdCgnbGknKS5hZGRDbGFzcygnYWN0aXZlJylcbiAgICAgIHRoaXMuJCgnI25hdmJhci1hY3RpdmUtc2l0ZW1hcC1pZCcpLnRleHQoJygnICsgdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcC5faWQgKyAnKScpXG4gICAgfVx0XHRlbHNlIHtcbiAgICAgIHRoaXMuJCgnI3NpdGVtYXAtbmF2LWJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpXG4gICAgICB0aGlzLiQoJyNuYXZiYXItYWN0aXZlLXNpdGVtYXAtaWQnKS50ZXh0KCcnKVxuICAgIH1cblxuICAgIGlmIChuYXZpZ2F0aW9uSWQubWF0Y2goL15jcmVhdGUtc2l0ZW1hcC0vKSkge1xuICAgICAgdGhpcy4kKCcjY3JlYXRlLXNpdGVtYXAtbmF2LWJ1dHRvbicpLmNsb3Nlc3QoJ2xpJykuYWRkQ2xhc3MoJ2FjdGl2ZScpXG4gICAgfVxuICB9LFxuXG5cdC8qKlxuXHQgKiBTaW1wbGUgaW5mbyBwb3B1cCBmb3Igc2l0ZW1hcCBzdGFydCB1cmwgaW5wdXQgZmllbGRcblx0ICovXG4gIGluaXRNdWx0aXBsZVN0YXJ0VXJsSGVscGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjc3RhcnRVcmwnKVxuXHRcdFx0LnBvcG92ZXIoe1xuICB0aXRsZTogJ011bHRpcGxlIHN0YXJ0IHVybHMnLFxuICBodG1sOiB0cnVlLFxuICBjb250ZW50OiAnWW91IGNhbiBjcmVhdGUgcmFuZ2VkIHN0YXJ0IHVybHMgbGlrZSB0aGlzOjxiciAvPmh0dHA6Ly9leGFtcGxlLmNvbS9bMS0xMDBdLmh0bWwnLFxuICBwbGFjZW1lbnQ6ICdib3R0b20nXG59KVxuXHRcdFx0LmJsdXIoZnVuY3Rpb24gKCkge1xuICB0aGlzLiQodGhpcykucG9wb3ZlcignaGlkZScpXG59KVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGJvb3RzdHJhcFZhbGlkYXRvciBvYmplY3QgZm9yIGN1cnJlbnQgZm9ybSBpbiB2aWV3cG9ydFxuXHQgKi9cbiAgZ2V0Rm9ybVZhbGlkYXRvcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLiQoJyN2aWV3cG9ydCBmb3JtJykuZGF0YSgnYm9vdHN0cmFwVmFsaWRhdG9yJylcbiAgICByZXR1cm4gdmFsaWRhdG9yXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgd2hldGhlciBjdXJyZW50IGZvcm0gaW4gdGhlIHZpZXdwb3J0IGlzIHZhbGlkXG5cdCAqIEByZXR1cm5zIHtCb29sZWFufVxuXHQgKi9cbiAgaXNWYWxpZEZvcm06IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcblxuXHRcdC8vIHZhbGlkYXRvci52YWxpZGF0ZSgpO1xuXHRcdC8vIHZhbGlkYXRlIG1ldGhvZCBjYWxscyBzdWJtaXQgd2hpY2ggaXMgbm90IG5lZWRlZCBpbiB0aGlzIGNhc2UuXG4gICAgZm9yICh2YXIgZmllbGQgaW4gdmFsaWRhdG9yLm9wdGlvbnMuZmllbGRzKSB7XG4gICAgICB2YWxpZGF0b3IudmFsaWRhdGVGaWVsZChmaWVsZClcbiAgICB9XG5cbiAgICB2YXIgdmFsaWQgPSB2YWxpZGF0b3IuaXNWYWxpZCgpXG4gICAgcmV0dXJuIHZhbGlkXG4gIH0sXG5cblx0LyoqXG5cdCAqIEFkZCB2YWxpZGF0aW9uIHRvIHNpdGVtYXAgY3JlYXRpb24gb3IgZWRpdGluZyBmb3JtXG5cdCAqL1xuICBpbml0U2l0ZW1hcFZhbGlkYXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCBmb3JtJykuYm9vdHN0cmFwVmFsaWRhdG9yKHtcbiAgICAgIGZpZWxkczoge1xuICAgICAgICAnX2lkJzoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc2l0ZW1hcCBpZCBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0cmluZ0xlbmd0aDoge1xuICAgICAgICAgICAgICBtaW46IDMsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc2l0ZW1hcCBpZCBzaG91bGQgYmUgYXRsZWFzdCAzIGNoYXJhY3RlcnMgbG9uZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWdleHA6IHtcbiAgICAgICAgICAgICAgcmVnZXhwOiAvXlthLXpdW2EtejAtOV8kKCkrXFwtL10rJC8sXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdPbmx5IGxvd2VyY2FzZSBjaGFyYWN0ZXJzIChhLXopLCBkaWdpdHMgKDAtOSksIG9yIGFueSBvZiB0aGUgY2hhcmFjdGVycyBfLCAkLCAoLCApLCArLCAtLCBhbmQgLyBhcmUgYWxsb3dlZC4gTXVzdCBiZWdpbiB3aXRoIGEgbGV0dGVyLidcbiAgICAgICAgICAgIH0sXG5cdFx0XHRcdFx0XHQvLyBwbGFjZWhvbGRlciBmb3Igc2l0ZW1hcCBpZCBleGlzdGFuY2UgdmFsaWRhdGlvblxuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1NpdGVtYXAgd2l0aCB0aGlzIGlkIGFscmVhZHkgZXhpc3RzJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgJ3N0YXJ0VXJsW10nOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBzdGFydCBVUkwgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1cmk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBzdGFydCBVUkwgaXMgbm90IGEgdmFsaWQgVVJMJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH0sXG5cbiAgc2hvd0NyZWF0ZVNpdGVtYXA6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ2NyZWF0ZS1zaXRlbWFwLWNyZWF0ZScpXG4gICAgdmFyIHNpdGVtYXBGb3JtID0gaWNoLlNpdGVtYXBDcmVhdGUoKVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbChzaXRlbWFwRm9ybSlcbiAgICB0aGlzLmluaXRNdWx0aXBsZVN0YXJ0VXJsSGVscGVyKClcbiAgICB0aGlzLmluaXRTaXRlbWFwVmFsaWRhdGlvbigpXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGluaXRJbXBvcnRTdGllbWFwVmFsaWRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnI3ZpZXdwb3J0IGZvcm0nKS5ib290c3RyYXBWYWxpZGF0b3Ioe1xuICAgICAgZmllbGRzOiB7XG4gICAgICAgICdfaWQnOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgc3RyaW5nTGVuZ3RoOiB7XG4gICAgICAgICAgICAgIG1pbjogMyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBzaXRlbWFwIGlkIHNob3VsZCBiZSBhdGxlYXN0IDMgY2hhcmFjdGVycyBsb25nJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlZ2V4cDoge1xuICAgICAgICAgICAgICByZWdleHA6IC9eW2Etel1bYS16MC05XyQoKStcXC0vXSskLyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ09ubHkgbG93ZXJjYXNlIGNoYXJhY3RlcnMgKGEteiksIGRpZ2l0cyAoMC05KSwgb3IgYW55IG9mIHRoZSBjaGFyYWN0ZXJzIF8sICQsICgsICksICssIC0sIGFuZCAvIGFyZSBhbGxvd2VkLiBNdXN0IGJlZ2luIHdpdGggYSBsZXR0ZXIuJ1xuICAgICAgICAgICAgfSxcblx0XHRcdFx0XHRcdC8vIHBsYWNlaG9sZGVyIGZvciBzaXRlbWFwIGlkIGV4aXN0YW5jZSB2YWxpZGF0aW9uXG4gICAgICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnU2l0ZW1hcCB3aXRoIHRoaXMgaWQgYWxyZWFkeSBleGlzdHMnLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzaXRlbWFwSlNPTjoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdTaXRlbWFwIEpTT04gaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjYWxsYmFjazoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnSlNPTiBpcyBub3QgdmFsaWQnLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgSlNPTi5wYXJzZSh2YWx1ZSlcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH0sXG5cbiAgc2hvd0ltcG9ydFNpdGVtYXBQYW5lbDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignY3JlYXRlLXNpdGVtYXAtaW1wb3J0JylcbiAgICB2YXIgc2l0ZW1hcEZvcm0gPSBpY2guU2l0ZW1hcEltcG9ydCgpXG4gICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKHNpdGVtYXBGb3JtKVxuICAgIHRoaXMuaW5pdEltcG9ydFN0aWVtYXBWYWxpZGF0aW9uKClcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIHNob3dTaXRlbWFwRXhwb3J0UGFuZWw6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtZXhwb3J0JylcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2l0ZW1hcEpTT04gPSBzaXRlbWFwLmV4cG9ydFNpdGVtYXAoKVxuICAgIHZhciBzaXRlbWFwRXhwb3J0Rm9ybSA9IGljaC5TaXRlbWFwRXhwb3J0KHtcbiAgICAgIHNpdGVtYXBKU09OOiBzaXRlbWFwSlNPTlxuICAgIH0pXG4gICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKHNpdGVtYXBFeHBvcnRGb3JtKVxuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgc2hvd1NpdGVtYXBzOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jbGVhclN0YXRlKClcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXBzJylcblxuICAgIHRoaXMuc3RvcmUuZ2V0QWxsU2l0ZW1hcHMoZnVuY3Rpb24gKHNpdGVtYXBzKSB7XG4gICAgICB2YXIgJHNpdGVtYXBMaXN0UGFuZWwgPSBpY2guU2l0ZW1hcExpc3QoKVxuICAgICAgc2l0ZW1hcHMuZm9yRWFjaChmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgICAgICB2YXIgJHNpdGVtYXAgPSBpY2guU2l0ZW1hcExpc3RJdGVtKHNpdGVtYXApXG4gICAgICAgICRzaXRlbWFwLmRhdGEoJ3NpdGVtYXAnLCBzaXRlbWFwKVxuICAgICAgICAkc2l0ZW1hcExpc3RQYW5lbC5maW5kKCd0Ym9keScpLmFwcGVuZCgkc2l0ZW1hcClcbiAgICAgIH0pXG4gICAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoJHNpdGVtYXBMaXN0UGFuZWwpXG4gICAgfSlcbiAgfSxcblxuICBnZXRTaXRlbWFwRnJvbU1ldGFkYXRhRm9ybTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBpZCA9IHRoaXMuJCgnI3ZpZXdwb3J0IGZvcm0gaW5wdXRbbmFtZT1faWRdJykudmFsKClcbiAgICB2YXIgJHN0YXJ0VXJsSW5wdXRzID0gdGhpcy4kKCcjdmlld3BvcnQgZm9ybSAuaW5wdXQtc3RhcnQtdXJsJylcbiAgICB2YXIgc3RhcnRVcmxcbiAgICBpZiAoJHN0YXJ0VXJsSW5wdXRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgc3RhcnRVcmwgPSAkc3RhcnRVcmxJbnB1dHMudmFsKClcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhcnRVcmwgPSBbXVxuICAgICAgJHN0YXJ0VXJsSW5wdXRzLmVhY2goZnVuY3Rpb24gKGksIGVsZW1lbnQpIHtcbiAgICAgICAgc3RhcnRVcmwucHVzaCh0aGlzLiQoZWxlbWVudCkudmFsKCkpXG4gICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpZDogaWQsXG4gICAgICBzdGFydFVybDogc3RhcnRVcmxcbiAgICB9XG4gIH0sXG5cbiAgY3JlYXRlU2l0ZW1hcDogZnVuY3Rpb24gKGZvcm0pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxudmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxudmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG5cdFx0Ly8gY2FuY2VsIHN1Ym1pdCBpZiBpbnZhbGlkIGZvcm1cbiAgICBpZiAoIXRoaXMuaXNWYWxpZEZvcm0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdmFyIHNpdGVtYXBEYXRhID0gdGhpcy5nZXRTaXRlbWFwRnJvbU1ldGFkYXRhRm9ybSgpXG5cblx0XHQvLyBjaGVjayB3aGV0aGVyIHNpdGVtYXAgd2l0aCB0aGlzIGlkIGFscmVhZHkgZXhpc3RcbiAgICB0aGlzLnN0b3JlLnNpdGVtYXBFeGlzdHMoc2l0ZW1hcERhdGEuaWQsIGZ1bmN0aW9uIChzaXRlbWFwRXhpc3RzKSB7XG4gICAgICBpZiAoc2l0ZW1hcEV4aXN0cykge1xuICAgICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgICAgdmFsaWRhdG9yLnVwZGF0ZVN0YXR1cygnX2lkJywgJ0lOVkFMSUQnLCAnY2FsbGJhY2snKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHNpdGVtYXAgPSBuZXcgU2l0ZW1hcCh7XG4gICAgICAgICAgX2lkOiBzaXRlbWFwRGF0YS5pZCxcbiAgICAgICAgICBzdGFydFVybDogc2l0ZW1hcERhdGEuc3RhcnRVcmwsXG4gICAgICAgICAgc2VsZWN0b3JzOiBbXVxuICAgICAgICB9LCB7JCwgZG9jdW1lbnQsIHdpbmRvd30pXG4gICAgICAgIHRoaXMuc3RvcmUuY3JlYXRlU2l0ZW1hcChzaXRlbWFwLCBmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgICAgICAgIHRoaXMuX2VkaXRTaXRlbWFwKHNpdGVtYXAsIFsnX3Jvb3QnXSlcbiAgICAgICAgfS5iaW5kKHRoaXMsIHNpdGVtYXApKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBpbXBvcnRTaXRlbWFwOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbnZhciBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnRcbnZhciB3aW5kb3cgPSB0aGlzLndpbmRvd1xuXHRcdC8vIGNhbmNlbCBzdWJtaXQgaWYgaW52YWxpZCBmb3JtXG4gICAgaWYgKCF0aGlzLmlzVmFsaWRGb3JtKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuXHRcdC8vIGxvYWQgZGF0YSBmcm9tIGZvcm1cbiAgICB2YXIgc2l0ZW1hcEpTT04gPSB0aGlzLiQoJ1tuYW1lPXNpdGVtYXBKU09OXScpLnZhbCgpXG4gICAgdmFyIGlkID0gdGhpcy4kKCdpbnB1dFtuYW1lPV9pZF0nKS52YWwoKVxuICAgIHZhciBzaXRlbWFwID0gbmV3IFNpdGVtYXAobnVsbCwgeyQsIGRvY3VtZW50LCB3aW5kb3d9KVxuICAgIHNpdGVtYXAuaW1wb3J0U2l0ZW1hcChzaXRlbWFwSlNPTilcbiAgICBpZiAoaWQubGVuZ3RoKSB7XG4gICAgICBzaXRlbWFwLl9pZCA9IGlkXG4gICAgfVxuXHRcdC8vIGNoZWNrIHdoZXRoZXIgc2l0ZW1hcCB3aXRoIHRoaXMgaWQgYWxyZWFkeSBleGlzdFxuICAgIHRoaXMuc3RvcmUuc2l0ZW1hcEV4aXN0cyhzaXRlbWFwLl9pZCwgZnVuY3Rpb24gKHNpdGVtYXBFeGlzdHMpIHtcbiAgICAgIGlmIChzaXRlbWFwRXhpc3RzKSB7XG4gICAgICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgICAgICB2YWxpZGF0b3IudXBkYXRlU3RhdHVzKCdfaWQnLCAnSU5WQUxJRCcsICdjYWxsYmFjaycpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnN0b3JlLmNyZWF0ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKHNpdGVtYXApIHtcbiAgICAgICAgICB0aGlzLl9lZGl0U2l0ZW1hcChzaXRlbWFwLCBbJ19yb290J10pXG4gICAgICAgIH0uYmluZCh0aGlzLCBzaXRlbWFwKSlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpXG4gIH0sXG5cbiAgZWRpdFNpdGVtYXBNZXRhZGF0YTogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1lZGl0LW1ldGFkYXRhJylcblxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciAkc2l0ZW1hcE1ldGFkYXRhRm9ybSA9IGljaC5TaXRlbWFwRWRpdE1ldGFkYXRhKHNpdGVtYXApXG4gICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKCRzaXRlbWFwTWV0YWRhdGFGb3JtKVxuICAgIHRoaXMuaW5pdE11bHRpcGxlU3RhcnRVcmxIZWxwZXIoKVxuICAgIHRoaXMuaW5pdFNpdGVtYXBWYWxpZGF0aW9uKClcblxuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgZWRpdFNpdGVtYXBNZXRhZGF0YVNhdmU6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxudmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxudmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNpdGVtYXBEYXRhID0gdGhpcy5nZXRTaXRlbWFwRnJvbU1ldGFkYXRhRm9ybSgpXG5cblx0XHQvLyBjYW5jZWwgc3VibWl0IGlmIGludmFsaWQgZm9ybVxuICAgIGlmICghdGhpcy5pc1ZhbGlkRm9ybSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cblx0XHQvLyBjaGVjayB3aGV0aGVyIHNpdGVtYXAgd2l0aCB0aGlzIGlkIGFscmVhZHkgZXhpc3RcbiAgICB0aGlzLnN0b3JlLnNpdGVtYXBFeGlzdHMoc2l0ZW1hcERhdGEuaWQsIGZ1bmN0aW9uIChzaXRlbWFwRXhpc3RzKSB7XG4gICAgICBpZiAoc2l0ZW1hcC5faWQgIT09IHNpdGVtYXBEYXRhLmlkICYmIHNpdGVtYXBFeGlzdHMpIHtcbiAgICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICAgIHZhbGlkYXRvci51cGRhdGVTdGF0dXMoJ19pZCcsICdJTlZBTElEJywgJ2NhbGxiYWNrJylcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cblx0XHRcdC8vIGNoYW5nZSBkYXRhXG4gICAgICBzaXRlbWFwLnN0YXJ0VXJsID0gc2l0ZW1hcERhdGEuc3RhcnRVcmxcblxuXHRcdFx0Ly8ganVzdCBjaGFuZ2Ugc2l0ZW1hcHMgdXJsXG4gICAgICBpZiAoc2l0ZW1hcERhdGEuaWQgPT09IHNpdGVtYXAuX2lkKSB7XG4gICAgICAgIHRoaXMuc3RvcmUuc2F2ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKHNpdGVtYXApIHtcbiAgICAgICAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWQgY2hhbmdlZC4gd2UgbmVlZCB0byBkZWxldGUgdGhlIG9sZCBvbmUgYW5kIGNyZWF0ZSBhIG5ldyBvbmVcbiAgICAgICAgdmFyIG5ld1NpdGVtYXAgPSBuZXcgU2l0ZW1hcChzaXRlbWFwLCB7JCwgZG9jdW1lbnQsIHdpbmRvd30pXG4gICAgICAgIHZhciBvbGRTaXRlbWFwID0gc2l0ZW1hcFxuICAgICAgICBuZXdTaXRlbWFwLl9pZCA9IHNpdGVtYXBEYXRhLmlkXG4gICAgICAgIHRoaXMuc3RvcmUuY3JlYXRlU2l0ZW1hcChuZXdTaXRlbWFwLCBmdW5jdGlvbiAobmV3U2l0ZW1hcCkge1xuICAgICAgICAgIHRoaXMuc3RvcmUuZGVsZXRlU2l0ZW1hcChvbGRTaXRlbWFwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwID0gbmV3U2l0ZW1hcFxuICAgICAgICAgICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gICAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBDYWxsYmFjayB3aGVuIHNpdGVtYXAgZWRpdCBidXR0b24gaXMgY2xpY2tlZCBpbiBzaXRlbWFwIGdyaWRcblx0ICovXG4gIGVkaXRTaXRlbWFwOiBmdW5jdGlvbiAodHIpIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuJCh0cikuZGF0YSgnc2l0ZW1hcCcpXG4gICAgdGhpcy5fZWRpdFNpdGVtYXAoc2l0ZW1hcClcbiAgfSxcbiAgX2VkaXRTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcCkge1xuICAgIHRoaXMuc2V0U3RhdGVFZGl0U2l0ZW1hcChzaXRlbWFwKVxuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcCcpXG5cbiAgICB0aGlzLnNob3dTaXRlbWFwU2VsZWN0b3JMaXN0KClcbiAgfSxcbiAgc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3Q6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtc2VsZWN0b3ItbGlzdCcpXG5cbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JzID0gdGhpcy5zdGF0ZS5lZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnNcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JJZCA9IHRoaXMuc3RhdGUuY3VycmVudFBhcmVudFNlbGVjdG9ySWRcblxuICAgIHZhciAkc2VsZWN0b3JMaXN0UGFuZWwgPSBpY2guU2VsZWN0b3JMaXN0KHtcbiAgICAgIHBhcmVudFNlbGVjdG9yczogcGFyZW50U2VsZWN0b3JzXG4gICAgfSlcbiAgICB2YXIgc2VsZWN0b3JzID0gc2l0ZW1hcC5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICAgIHNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgdmFyICRzZWxlY3RvciA9IGljaC5TZWxlY3Rvckxpc3RJdGVtKHNlbGVjdG9yKVxuICAgICAgJHNlbGVjdG9yLmRhdGEoJ3NlbGVjdG9yJywgc2VsZWN0b3IpXG4gICAgICAkc2VsZWN0b3JMaXN0UGFuZWwuZmluZCgndGJvZHknKS5hcHBlbmQoJHNlbGVjdG9yKVxuICAgIH0pXG4gICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKCRzZWxlY3Rvckxpc3RQYW5lbClcblxuICAgIHJldHVybiB0cnVlXG4gIH0sIC8qXG4gIHNob3dTaXRlbWFwU2VsZWN0b3JHcmFwaDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1zZWxlY3Rvci1ncmFwaCcpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyICRzZWxlY3RvckdyYXBoUGFuZWwgPSBpY2guU2l0ZW1hcFNlbGVjdG9yR3JhcGgoKVxuICAgICQoJyN2aWV3cG9ydCcpLmh0bWwoJHNlbGVjdG9yR3JhcGhQYW5lbClcbiAgICB2YXIgZ3JhcGhEaXYgPSAkKCcjc2VsZWN0b3ItZ3JhcGgnKVswXVxuICAgIHZhciBncmFwaCA9IG5ldyBTZWxlY3RvckdyYXBodjIoc2l0ZW1hcClcbiAgICBncmFwaC5kcmF3KGdyYXBoRGl2LCAkKGRvY3VtZW50KS53aWR0aCgpLCAyMDApXG4gICAgcmV0dXJuIHRydWVcbiAgfSwgKi9cbiAgc2hvd0NoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAodHIpIHtcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLiQodHIpLmRhdGEoJ3NlbGVjdG9yJylcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JzID0gdGhpcy5zdGF0ZS5lZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnNcbiAgICB0aGlzLnN0YXRlLmN1cnJlbnRQYXJlbnRTZWxlY3RvcklkID0gc2VsZWN0b3IuaWRcbiAgICBwYXJlbnRTZWxlY3RvcnMucHVzaChzZWxlY3RvcilcblxuICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICB9LFxuXG4gIHRyZWVOYXZpZ2F0aW9uc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3Q6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgcGFyZW50U2VsZWN0b3JzID0gdGhpcy5zdGF0ZS5lZGl0U2l0ZW1hcEJyZWFkY3VtYnNTZWxlY3RvcnNcbiAgICB2YXIgY29udHJvbGxlciA9IHRoaXNcbiAgICB0aGlzLiQoJyNzZWxlY3Rvci10cmVlIC5icmVhZGNydW1iIGxpIGEnKS5lYWNoKGZ1bmN0aW9uIChpLCBwYXJlbnRTZWxlY3RvckJ1dHRvbikge1xuICAgICAgaWYgKHBhcmVudFNlbGVjdG9yQnV0dG9uID09PSBidXR0b24pIHtcbiAgICAgICAgcGFyZW50U2VsZWN0b3JzLnNwbGljZShpICsgMSlcbiAgICAgICAgY29udHJvbGxlci5zdGF0ZS5jdXJyZW50UGFyZW50U2VsZWN0b3JJZCA9IHBhcmVudFNlbGVjdG9yc1tpXS5pZFxuICAgICAgfVxuICAgIH0pXG4gICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gIH0sXG5cbiAgaW5pdFNlbGVjdG9yVmFsaWRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnI3ZpZXdwb3J0IGZvcm0nKS5ib290c3RyYXBWYWxpZGF0b3Ioe1xuICAgICAgZmllbGRzOiB7XG4gICAgICAgICdpZCc6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnU2l0ZW1hcCBpZCByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0cmluZ0xlbmd0aDoge1xuICAgICAgICAgICAgICBtaW46IDMsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgc2l0ZW1hcCBpZCBzaG91bGQgYmUgYXRsZWFzdCAzIGNoYXJhY3RlcnMgbG9uZydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWdleHA6IHtcbiAgICAgICAgICAgICAgcmVnZXhwOiAvXlteX10uKiQvLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnU2VsZWN0b3IgaWQgY2Fubm90IHN0YXJ0IHdpdGggYW4gdW5kZXJzY29yZSBfJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2VsZWN0b3I6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnU2VsZWN0b3IgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJlZ2V4OiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0phdmFTY3JpcHQgZG9lcyBub3Qgc3VwcG9ydCByZWd1bGFyIGV4cHJlc3Npb25zIHRoYXQgY2FuIG1hdGNoIDAgY2hhcmFjdGVycy4nLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBhbGxvdyBubyByZWdleFxuICAgICAgICAgICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoZXMgPSAnJy5tYXRjaChuZXcgUmVnRXhwKHZhbHVlKSlcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hlcyAhPT0gbnVsbCAmJiBtYXRjaGVzWzBdID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjbGlja0VsZW1lbnRTZWxlY3Rvcjoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdDbGljayBzZWxlY3RvciBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdGFibGVIZWFkZXJSb3dTZWxlY3Rvcjoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdIZWFkZXIgcm93IHNlbGVjdG9yIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB0YWJsZURhdGFSb3dTZWxlY3Rvcjoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdEYXRhIHJvdyBzZWxlY3RvciBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBudW1lcmljOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdEZWxheSBtdXN0IGJlIG51bWVyaWMnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBwYXJlbnRTZWxlY3RvcnM6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnWW91IG11c3QgY2hvb3NlIGF0IGxlYXN0IG9uZSBwYXJlbnQgc2VsZWN0b3InXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0Nhbm5vdCBoYW5kbGUgcmVjdXJzaXZlIGVsZW1lbnQgc2VsZWN0b3JzJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yLCAkZmllbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwKClcbiAgICAgICAgICAgICAgICByZXR1cm4gIXNpdGVtYXAuc2VsZWN0b3JzLmhhc1JlY3Vyc2l2ZUVsZW1lbnRTZWxlY3RvcnMoKVxuICAgICAgICAgICAgICB9LmJpbmQodGhpcylcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9LFxuICBlZGl0U2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLiQoYnV0dG9uKS5jbG9zZXN0KCd0cicpLmRhdGEoJ3NlbGVjdG9yJylcbiAgICB0aGlzLl9lZGl0U2VsZWN0b3Ioc2VsZWN0b3IpXG4gIH0sXG4gIHVwZGF0ZVNlbGVjdG9yUGFyZW50TGlzdE9uSWRDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICB0aGlzLiQoJy5jdXJyZW50bHktZWRpdGVkJykudmFsKHNlbGVjdG9yLmlkKS50ZXh0KHNlbGVjdG9yLmlkKVxuICB9LFxuICBfZWRpdFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgc2VsZWN0b3JJZHMgPSBzaXRlbWFwLmdldFBvc3NpYmxlUGFyZW50U2VsZWN0b3JJZHMoKVxuXG4gICAgdmFyICRlZGl0U2VsZWN0b3JGb3JtID0gaWNoLlNlbGVjdG9yRWRpdCh7XG4gICAgICBzZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgICBzZWxlY3Rvcklkczogc2VsZWN0b3JJZHMsXG4gICAgICBzZWxlY3RvclR5cGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JUZXh0JyxcbiAgICAgICAgICB0aXRsZTogJ1RleHQnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JMaW5rJyxcbiAgICAgICAgICB0aXRsZTogJ0xpbmsnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JQb3B1cExpbmsnLFxuICAgICAgICAgIHRpdGxlOiAnUG9wdXAgTGluaydcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdTZWxlY3RvckltYWdlJyxcbiAgICAgICAgICB0aXRsZTogJ0ltYWdlJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yVGFibGUnLFxuICAgICAgICAgIHRpdGxlOiAnVGFibGUnXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlJyxcbiAgICAgICAgICB0aXRsZTogJ0VsZW1lbnQgYXR0cmlidXRlJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9ySFRNTCcsXG4gICAgICAgICAgdGl0bGU6ICdIVE1MJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yRWxlbWVudCcsXG4gICAgICAgICAgdGl0bGU6ICdFbGVtZW50J1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yRWxlbWVudFNjcm9sbCcsXG4gICAgICAgICAgdGl0bGU6ICdFbGVtZW50IHNjcm9sbCBkb3duJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogJ1NlbGVjdG9yRWxlbWVudENsaWNrJyxcbiAgICAgICAgICB0aXRsZTogJ0VsZW1lbnQgY2xpY2snXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnU2VsZWN0b3JHcm91cCcsXG4gICAgICAgICAgdGl0bGU6ICdHcm91cGVkJ1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfSlcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoJGVkaXRTZWxlY3RvckZvcm0pXG5cdFx0Ly8gbWFyayBpbml0aWFsbHkgb3BlbmVkIHNlbGVjdG9yIGFzIGN1cnJlbnRseSBlZGl0ZWRcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yICNwYXJlbnRTZWxlY3RvcnMgb3B0aW9uJykuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgaWYgKHNlbGYuJChlbGVtZW50KS52YWwoKSA9PT0gc2VsZWN0b3IuaWQpIHtcbiAgICAgICAgc2VsZi4kKGVsZW1lbnQpLmFkZENsYXNzKCdjdXJyZW50bHktZWRpdGVkJylcbiAgICAgIH1cbiAgICB9KVxuXG5cdFx0Ly8gc2V0IGNsaWNrVHlwZVxuICAgIGlmIChzZWxlY3Rvci5jbGlja1R5cGUpIHtcbiAgICAgICRlZGl0U2VsZWN0b3JGb3JtLmZpbmQoJ1tuYW1lPWNsaWNrVHlwZV0nKS52YWwoc2VsZWN0b3IuY2xpY2tUeXBlKVxuICAgIH1cblx0XHQvLyBzZXQgY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGVcbiAgICBpZiAoc2VsZWN0b3IuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUpIHtcbiAgICAgICRlZGl0U2VsZWN0b3JGb3JtLmZpbmQoJ1tuYW1lPWNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXScpLnZhbChzZWxlY3Rvci5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSlcbiAgICB9XG5cblx0XHQvLyBoYW5kbGUgc2VsZWN0cyBzZXBlcmF0ZWx5XG4gICAgJGVkaXRTZWxlY3RvckZvcm0uZmluZCgnW25hbWU9dHlwZV0nKS52YWwoc2VsZWN0b3IudHlwZSlcbiAgICBzZWxlY3Rvci5wYXJlbnRTZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICAgICAgJGVkaXRTZWxlY3RvckZvcm0uZmluZChcIiNwYXJlbnRTZWxlY3RvcnMgW3ZhbHVlPSdcIiArIHBhcmVudFNlbGVjdG9ySWQgKyBcIiddXCIpLmF0dHIoJ3NlbGVjdGVkJywgJ3NlbGVjdGVkJylcbiAgICB9KVxuXG4gICAgdGhpcy5zdGF0ZS5jdXJyZW50U2VsZWN0b3IgPSBzZWxlY3RvclxuICAgIHRoaXMuc2VsZWN0b3JUeXBlQ2hhbmdlZCgpXG4gICAgdGhpcy5pbml0U2VsZWN0b3JWYWxpZGF0aW9uKClcbiAgfSxcbiAgc2VsZWN0b3JUeXBlQ2hhbmdlZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciB0eXBlID0gdGhpcy4kKCcjZWRpdC1zZWxlY3RvciBzZWxlY3RbbmFtZT10eXBlXScpLnZhbCgpXG4gICAgdmFyIGZlYXR1cmVzID0gc2VsZWN0b3JzW3R5cGVdLmdldEZlYXR1cmVzKClcbiAgICB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yIC5mZWF0dXJlJykuaGlkZSgpXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgZmVhdHVyZXMuZm9yRWFjaChmdW5jdGlvbiAoZmVhdHVyZSkge1xuICAgICAgc2VsZi4kKCcjZWRpdC1zZWxlY3RvciAuZmVhdHVyZS0nICsgZmVhdHVyZSkuc2hvdygpXG4gICAgfSlcblxuXHRcdC8vIGFkZCB0aGlzIHNlbGVjdG9yIHRvIHBvc3NpYmxlIHBhcmVudCBzZWxlY3RvclxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIGlmIChzZWxlY3Rvci5jYW5IYXZlQ2hpbGRTZWxlY3RvcnMoKSkge1xuICAgICAgaWYgKHRoaXMuJCgnI2VkaXQtc2VsZWN0b3IgI3BhcmVudFNlbGVjdG9ycyAuY3VycmVudGx5LWVkaXRlZCcpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgJG9wdGlvbiA9IHRoaXMuJCgnPG9wdGlvbiBjbGFzcz1cImN1cnJlbnRseS1lZGl0ZWRcIj48L29wdGlvbj4nKVxuICAgICAgICAkb3B0aW9uLnRleHQoc2VsZWN0b3IuaWQpLnZhbChzZWxlY3Rvci5pZClcbiAgICAgICAgdGhpcy4kKCcjZWRpdC1zZWxlY3RvciAjcGFyZW50U2VsZWN0b3JzJykuYXBwZW5kKCRvcHRpb24pXG4gICAgICB9XG4gICAgfSBlbHNlIHtcblx0XHQvLyByZW1vdmUgaWYgdHlwZSBkb2Vzbid0IGFsbG93IHRvIGhhdmUgY2hpbGQgc2VsZWN0b3JzXG4gICAgICB0aGlzLiQoJyNlZGl0LXNlbGVjdG9yICNwYXJlbnRTZWxlY3RvcnMgLmN1cnJlbnRseS1lZGl0ZWQnKS5yZW1vdmUoKVxuICAgIH1cbiAgfSxcbiAgc2F2ZVNlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5zdGF0ZS5jdXJyZW50U2VsZWN0b3JcbiAgICB2YXIgbmV3U2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcblxuXHRcdC8vIGNhbmNlbCBzdWJtaXQgaWYgaW52YWxpZCBmb3JtXG4gICAgaWYgKCF0aGlzLmlzVmFsaWRGb3JtKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuXHRcdC8vIGNhbmNlbCBwb3NzaWJsZSBlbGVtZW50IHNlbGVjdGlvblxuICAgIHRoaXMuY29udGVudFNjcmlwdC5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICBzaXRlbWFwLnVwZGF0ZVNlbGVjdG9yKHNlbGVjdG9yLCBuZXdTZWxlY3RvcilcblxuICAgICAgdGhpcy5zdG9yZS5zYXZlU2l0ZW1hcChzaXRlbWFwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc2hvd1NpdGVtYXBTZWxlY3Rvckxpc3QoKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblx0LyoqXG5cdCAqIEdldCBzZWxlY3RvciBmcm9tIHNlbGVjdG9yIGVkaXRpbmcgZm9ybVxuXHQgKi9cbiAgZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnRcbiAgICB2YXIgd2luZG93ID0gdGhpcy53aW5kb3dcbiAgICB2YXIgaWQgPSAkKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1pZF0nKS52YWwoKVxuICAgIHZhciBzZWxlY3RvcnNTZWxlY3RvciA9ICQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPXNlbGVjdG9yXScpLnZhbCgpXG4gICAgdmFyIHRhYmxlRGF0YVJvd1NlbGVjdG9yID0gJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9dGFibGVEYXRhUm93U2VsZWN0b3JdJykudmFsKClcbiAgICB2YXIgdGFibGVIZWFkZXJSb3dTZWxlY3RvciA9ICQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPXRhYmxlSGVhZGVyUm93U2VsZWN0b3JdJykudmFsKClcbiAgICB2YXIgY2xpY2tFbGVtZW50U2VsZWN0b3IgPSAkKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1jbGlja0VsZW1lbnRTZWxlY3Rvcl0nKS52YWwoKVxuICAgIHZhciB0eXBlID0gJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9dHlwZV0nKS52YWwoKVxuICAgIHZhciBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9ICQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlXScpLnZhbCgpXG4gICAgdmFyIGNsaWNrVHlwZSA9ICQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPWNsaWNrVHlwZV0nKS52YWwoKVxuICAgIHZhciBkaXNjYXJkSW5pdGlhbEVsZW1lbnRzID0gJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9ZGlzY2FyZEluaXRpYWxFbGVtZW50c10nKS5pcygnOmNoZWNrZWQnKVxuICAgIHZhciBtdWx0aXBsZSA9ICQoJyNlZGl0LXNlbGVjdG9yIFtuYW1lPW11bHRpcGxlXScpLmlzKCc6Y2hlY2tlZCcpXG4gICAgdmFyIGRvd25sb2FkSW1hZ2UgPSAkKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1kb3dubG9hZEltYWdlXScpLmlzKCc6Y2hlY2tlZCcpXG4gICAgdmFyIGNsaWNrUG9wdXAgPSAkKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1jbGlja1BvcHVwXScpLmlzKCc6Y2hlY2tlZCcpXG4gICAgdmFyIHJlZ2V4ID0gJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9cmVnZXhdJykudmFsKClcbiAgICB2YXIgZGVsYXkgPSAkKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1kZWxheV0nKS52YWwoKVxuICAgIHZhciBleHRyYWN0QXR0cmlidXRlID0gJCgnI2VkaXQtc2VsZWN0b3IgW25hbWU9ZXh0cmFjdEF0dHJpYnV0ZV0nKS52YWwoKVxuICAgIHZhciBwYXJlbnRTZWxlY3RvcnMgPSAkKCcjZWRpdC1zZWxlY3RvciBbbmFtZT1wYXJlbnRTZWxlY3RvcnNdJykudmFsKClcbiAgICB2YXIgY29sdW1ucyA9IFtdXG4gICAgdmFyICRjb2x1bW5IZWFkZXJzID0gJCgnI2VkaXQtc2VsZWN0b3IgLmNvbHVtbi1oZWFkZXInKVxuICAgIHZhciAkY29sdW1uTmFtZXMgPSAkKCcjZWRpdC1zZWxlY3RvciAuY29sdW1uLW5hbWUnKVxuICAgIHZhciAkY29sdW1uRXh0cmFjdHMgPSAkKCcjZWRpdC1zZWxlY3RvciAuY29sdW1uLWV4dHJhY3QnKVxuXG4gICAgJGNvbHVtbkhlYWRlcnMuZWFjaChmdW5jdGlvbiAoaSkge1xuICAgICAgdmFyIGhlYWRlciA9ICQoJGNvbHVtbkhlYWRlcnNbaV0pLnZhbCgpXG4gICAgICB2YXIgbmFtZSA9ICQoJGNvbHVtbk5hbWVzW2ldKS52YWwoKVxuICAgICAgdmFyIGV4dHJhY3QgPSAkKCRjb2x1bW5FeHRyYWN0c1tpXSkuaXMoJzpjaGVja2VkJylcbiAgICAgIGNvbHVtbnMucHVzaCh7XG4gICAgICAgIGhlYWRlcjogaGVhZGVyLFxuICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICBleHRyYWN0OiBleHRyYWN0XG4gICAgICB9KVxuICAgIH0pXG5cbiAgICB2YXIgbmV3U2VsZWN0b3IgPSBuZXcgU2VsZWN0b3Ioe1xuICAgICAgaWQ6IGlkLFxuICAgICAgc2VsZWN0b3I6IHNlbGVjdG9yc1NlbGVjdG9yLFxuICAgICAgdGFibGVIZWFkZXJSb3dTZWxlY3RvcjogdGFibGVIZWFkZXJSb3dTZWxlY3RvcixcbiAgICAgIHRhYmxlRGF0YVJvd1NlbGVjdG9yOiB0YWJsZURhdGFSb3dTZWxlY3RvcixcbiAgICAgIGNsaWNrRWxlbWVudFNlbGVjdG9yOiBjbGlja0VsZW1lbnRTZWxlY3RvcixcbiAgICAgIGNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlOiBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSxcbiAgICAgIGNsaWNrVHlwZTogY2xpY2tUeXBlLFxuICAgICAgZGlzY2FyZEluaXRpYWxFbGVtZW50czogZGlzY2FyZEluaXRpYWxFbGVtZW50cyxcbiAgICAgIHR5cGU6IHR5cGUsXG4gICAgICBtdWx0aXBsZTogbXVsdGlwbGUsXG4gICAgICBkb3dubG9hZEltYWdlOiBkb3dubG9hZEltYWdlLFxuICAgICAgY2xpY2tQb3B1cDogY2xpY2tQb3B1cCxcbiAgICAgIHJlZ2V4OiByZWdleCxcbiAgICAgIGV4dHJhY3RBdHRyaWJ1dGU6IGV4dHJhY3RBdHRyaWJ1dGUsXG4gICAgICBwYXJlbnRTZWxlY3RvcnM6IHBhcmVudFNlbGVjdG9ycyxcbiAgICAgIGNvbHVtbnM6IGNvbHVtbnMsXG4gICAgICBkZWxheTogZGVsYXlcbiAgICB9LCB7XG4gICAgICAkLCBkb2N1bWVudCwgd2luZG93XG4gICAgfSlcbiAgICByZXR1cm4gbmV3U2VsZWN0b3JcbiAgfSxcblx0LyoqXG5cdCAqIEByZXR1cm5zIHtTaXRlbWFwfCp9IENsb25lZCBTaXRlbWFwIHdpdGggY3VycmVudGx5IGVkaXRlZCBzZWxlY3RvclxuXHQgKi9cbiAgZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwLmNsb25lKClcbiAgICB2YXIgc2VsZWN0b3IgPSBzaXRlbWFwLmdldFNlbGVjdG9yQnlJZCh0aGlzLnN0YXRlLmN1cnJlbnRTZWxlY3Rvci5pZClcbiAgICB2YXIgbmV3U2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICBzaXRlbWFwLnVwZGF0ZVNlbGVjdG9yKHNlbGVjdG9yLCBuZXdTZWxlY3RvcilcbiAgICByZXR1cm4gc2l0ZW1hcFxuICB9LFxuICBjYW5jZWxTZWxlY3RvckVkaXRpbmc6IGZ1bmN0aW9uIChidXR0b24pIHtcblx0XHQvLyBjYW5jZWwgcG9zc2libGUgZWxlbWVudCBzZWxlY3Rpb25cbiAgICB0aGlzLmNvbnRlbnRTY3JpcHQucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuICBhZGRTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkID0gdGhpcy5zdGF0ZS5jdXJyZW50UGFyZW50U2VsZWN0b3JJZFxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuXG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG4gICAgdmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gICAgdmFyIHNlbGVjdG9yID0gbmV3IFNlbGVjdG9yKHtcbiAgICAgIHBhcmVudFNlbGVjdG9yczogW3BhcmVudFNlbGVjdG9ySWRdLFxuICAgICAgdHlwZTogJ1NlbGVjdG9yVGV4dCcsXG4gICAgICBtdWx0aXBsZTogZmFsc2VcbiAgICB9LCB7JCwgd2luZG93LCBkb2N1bWVudH0pXG5cbiAgICB0aGlzLl9lZGl0U2VsZWN0b3Ioc2VsZWN0b3IsIHNpdGVtYXApXG4gIH0sXG4gIGRlbGV0ZVNlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy4kKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzZWxlY3RvcicpXG4gICAgc2l0ZW1hcC5kZWxldGVTZWxlY3RvcihzZWxlY3RvcilcblxuICAgIHRoaXMuc3RvcmUuc2F2ZVNpdGVtYXAoc2l0ZW1hcCwgZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5zaG93U2l0ZW1hcFNlbGVjdG9yTGlzdCgpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuICBkZWxldGVTaXRlbWFwOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLiQoYnV0dG9uKS5jbG9zZXN0KCd0cicpLmRhdGEoJ3NpdGVtYXAnKVxuICAgIHZhciBjb250cm9sbGVyID0gdGhpc1xuICAgIHRoaXMuc3RvcmUuZGVsZXRlU2l0ZW1hcChzaXRlbWFwLCBmdW5jdGlvbiAoKSB7XG4gICAgICBjb250cm9sbGVyLnNob3dTaXRlbWFwcygpXG4gICAgfSlcbiAgfSxcbiAgaW5pdFNjcmFwZVNpdGVtYXBDb25maWdWYWxpZGF0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kKCcjdmlld3BvcnQgZm9ybScpLmJvb3RzdHJhcFZhbGlkYXRvcih7XG4gICAgICBmaWVsZHM6IHtcbiAgICAgICAgJ3JlcXVlc3RJbnRlcnZhbCc6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHJlcXVlc3QgaW50ZXJ2YWwgaXMgcmVxdWlyZWQgYW5kIGNhbm5vdCBiZSBlbXB0eSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBudW1lcmljOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcmVxdWVzdCBpbnRlcnZhbCBtdXN0IGJlIG51bWVyaWMnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSByZXF1ZXN0IGludGVydmFsIG11c3QgYmUgYXRsZWFzdCAyMDAwIG1pbGxpc2Vjb25kcycsXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbiAodmFsdWUsIHZhbGlkYXRvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSA+PSAyMDAwXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgICdwYWdlTG9hZERlbGF5Jzoge1xuICAgICAgICAgIHZhbGlkYXRvcnM6IHtcbiAgICAgICAgICAgIG5vdEVtcHR5OiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcGFnZSBsb2FkIGRlbGF5IGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbnVtZXJpYzoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHBhZ2UgbGFvZCBkZWxheSBtdXN0IGJlIG51bWVyaWMnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2s6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBwYWdlIGxvYWQgZGVsYXkgbXVzdCBiZSBhdGxlYXN0IDUwMCBtaWxsaXNlY29uZHMnLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPj0gNTAwXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9LFxuICBpbml0SGVhZGxlc3NTY3JhcGVTaXRlbWFwQ29uZmlnVmFsaWRhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJCgnI3ZpZXdwb3J0IGZvcm0nKS5ib290c3RyYXBWYWxpZGF0b3Ioe1xuICAgICAgZmllbGRzOiB7XG4gICAgICAgICdyZXF1ZXN0SW50ZXJ2YWwnOiB7XG4gICAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgICAgbm90RW1wdHk6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSByZXF1ZXN0IGludGVydmFsIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbnVtZXJpYzoge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHJlcXVlc3QgaW50ZXJ2YWwgbXVzdCBiZSBudW1lcmljJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcmVxdWVzdCBpbnRlcnZhbCBtdXN0IGJlIGF0bGVhc3QgMjAwMCBtaWxsaXNlY29uZHMnLFxuICAgICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24gKHZhbHVlLCB2YWxpZGF0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPj0gMjAwMFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAncGFnZUxvYWREZWxheSc6IHtcbiAgICAgICAgICB2YWxpZGF0b3JzOiB7XG4gICAgICAgICAgICBub3RFbXB0eToge1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnVGhlIHBhZ2UgbG9hZCBkZWxheSBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG51bWVyaWM6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1RoZSBwYWdlIGxhb2QgZGVsYXkgbXVzdCBiZSBudW1lcmljJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiB7XG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdUaGUgcGFnZSBsb2FkIGRlbGF5IG11c3QgYmUgYXRsZWFzdCA1MDAgbWlsbGlzZWNvbmRzJyxcbiAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uICh2YWx1ZSwgdmFsaWRhdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID49IDUwMFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfSxcbiAgc2hvd1NjcmFwZVNpdGVtYXBDb25maWdQYW5lbDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1zY3JhcGUnKVxuICAgIHZhciBzY3JhcGVDb25maWdQYW5lbCA9IGljaC5TaXRlbWFwU2NyYXBlQ29uZmlnKClcbiAgICB0aGlzLiQoJyN2aWV3cG9ydCcpLmh0bWwoc2NyYXBlQ29uZmlnUGFuZWwpXG4gICAgdGhpcy5pbml0U2NyYXBlU2l0ZW1hcENvbmZpZ1ZhbGlkYXRpb24oKVxuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHNob3dIZWFkbGVzc1NjcmFwZVNpdGVtYXBDb25maWdQYW5lbDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc2V0QWN0aXZlTmF2aWdhdGlvbkJ1dHRvbignc2l0ZW1hcC1oZWFkbGVzcy1zY3JhcGUnKVxuICAgIHZhciBzY3JhcGVDb25maWdQYW5lbCA9IGljaC5TaXRlbWFwSGVhZGxlc3NTY3JhcGVDb25maWcoKVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbChzY3JhcGVDb25maWdQYW5lbClcbiAgICB0aGlzLmluaXRIZWFkbGVzc1NjcmFwZVNpdGVtYXBDb25maWdWYWxpZGF0aW9uKClcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuICBzY3JhcGVTaXRlbWFwOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmlzVmFsaWRGb3JtKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIHZhciByZXF1ZXN0SW50ZXJ2YWwgPSB0aGlzLiQoJ2lucHV0W25hbWU9cmVxdWVzdEludGVydmFsXScpLnZhbCgpXG4gICAgdmFyIHBhZ2VMb2FkRGVsYXkgPSB0aGlzLiQoJ2lucHV0W25hbWU9cGFnZUxvYWREZWxheV0nKS52YWwoKVxuXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBzY3JhcGVTaXRlbWFwOiB0cnVlLFxuICAgICAgc2l0ZW1hcDogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSksXG4gICAgICByZXF1ZXN0SW50ZXJ2YWw6IHJlcXVlc3RJbnRlcnZhbCxcbiAgICAgIHBhZ2VMb2FkRGVsYXk6IHBhZ2VMb2FkRGVsYXlcbiAgICB9XG5cblx0XHQvLyBzaG93IHNpdGVtYXAgc2NyYXBpbmcgcGFuZWxcbiAgICB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKS5kZXN0cm95KClcbiAgICB0aGlzLiQoJy5zY3JhcGluZy1pbi1wcm9ncmVzcycpLnJlbW92ZUNsYXNzKCdoaWRlJylcbiAgICB0aGlzLiQoJyNzdWJtaXQtc2NyYXBlLXNpdGVtYXAnKS5jbG9zZXN0KCcuZm9ybS1ncm91cCcpLmhpZGUoKVxuICAgIHRoaXMuJCgnI3NjcmFwZS1zaXRlbWFwLWNvbmZpZyBpbnB1dCcpLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSlcblxuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgdGhpcy5icm93c2VTaXRlbWFwRGF0YSgpXG4gICAgfS5iaW5kKHRoaXMpKVxuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBoZWFkbGVzc1NjcmFwZVNpdGVtYXA6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuaXNWYWxpZEZvcm0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdmFyIHJlcXVlc3RJbnRlcnZhbCA9IHRoaXMuJCgnaW5wdXRbbmFtZT1yZXF1ZXN0SW50ZXJ2YWxdJykudmFsKClcbiAgICB2YXIgcGFnZUxvYWREZWxheSA9IHRoaXMuJCgnaW5wdXRbbmFtZT1wYWdlTG9hZERlbGF5XScpLnZhbCgpXG5cbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgIGhlYWRsZXNzU2NyYXBlU2l0ZW1hcDogdHJ1ZSxcbiAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpLFxuICAgICAgcmVxdWVzdEludGVydmFsOiByZXF1ZXN0SW50ZXJ2YWwsXG4gICAgICBwYWdlTG9hZERlbGF5OiBwYWdlTG9hZERlbGF5XG4gICAgfVxuXG4gICAgLy8gc2hvdyBzaXRlbWFwIHNjcmFwaW5nIHBhbmVsXG4gICAgdGhpcy5nZXRGb3JtVmFsaWRhdG9yKCkuZGVzdHJveSgpXG4gICAgdGhpcy4kKCcuc2NyYXBpbmctaW4tcHJvZ3Jlc3MnKS5yZW1vdmVDbGFzcygnaGlkZScpXG4gICAgdGhpcy4kKCcjc3VibWl0LXNjcmFwZS1zaXRlbWFwJykuY2xvc2VzdCgnLmZvcm0tZ3JvdXAnKS5oaWRlKClcbiAgICB0aGlzLiQoJyNzY3JhcGUtc2l0ZW1hcC1jb25maWcgaW5wdXQnKS5wcm9wKCdkaXNhYmxlZCcsIHRydWUpXG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIHRoaXMuYnJvd3NlU2l0ZW1hcERhdGEoKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgc2l0ZW1hcExpc3RCcm93c2VTaXRlbWFwRGF0YTogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy4kKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzaXRlbWFwJylcbiAgICB0aGlzLnNldFN0YXRlRWRpdFNpdGVtYXAoc2l0ZW1hcClcbiAgICB0aGlzLmJyb3dzZVNpdGVtYXBEYXRhKClcbiAgfSxcbiAgYnJvd3NlU2l0ZW1hcERhdGE6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtYnJvd3NlJylcbiAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICB0aGlzLnN0b3JlLmdldFNpdGVtYXBEYXRhKHNpdGVtYXAsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICB2YXIgZGF0YUNvbHVtbnMgPSBzaXRlbWFwLmdldERhdGFDb2x1bW5zKClcblxuICAgICAgdmFyIGRhdGFQYW5lbCA9IGljaC5TaXRlbWFwQnJvd3NlRGF0YSh7XG4gICAgICAgIGNvbHVtbnM6IGRhdGFDb2x1bW5zXG4gICAgICB9KVxuICAgICAgdGhpcy4kKCcjdmlld3BvcnQnKS5odG1sKGRhdGFQYW5lbClcblxuXHRcdFx0Ly8gZGlzcGxheSBkYXRhXG5cdFx0XHQvLyBEb2luZyB0aGlzIHRoZSBsb25nIHdheSBzbyB0aGVyZSBhcmVuJ3QgeHNzIHZ1bG5lcnViaWxpdGVzXG5cdFx0XHQvLyB3aGlsZSB3b3JraW5nIHdpdGggZGF0YSBvciB3aXRoIHRoZSBzZWxlY3RvciB0aXRsZXNcbiAgICAgIHZhciAkdGJvZHkgPSB0aGlzLiQoJyNzaXRlbWFwLWRhdGEgdGJvZHknKVxuICAgICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24gKHJvdykge1xuICAgICAgICB2YXIgJHRyID0gc2VsZi4kKCc8dHI+PC90cj4nKVxuICAgICAgICBkYXRhQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgICAgICB2YXIgJHRkID0gc2VsZi4kKCc8dGQ+PC90ZD4nKVxuICAgICAgICAgIHZhciBjZWxsRGF0YSA9IHJvd1tjb2x1bW5dXG4gICAgICAgICAgaWYgKHR5cGVvZiBjZWxsRGF0YSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNlbGxEYXRhID0gSlNPTi5zdHJpbmdpZnkoY2VsbERhdGEpXG4gICAgICAgICAgfVxuICAgICAgICAgICR0ZC50ZXh0KGNlbGxEYXRhKVxuICAgICAgICAgICR0ci5hcHBlbmQoJHRkKVxuICAgICAgICB9KVxuICAgICAgICAkdGJvZHkuYXBwZW5kKCR0cilcbiAgICAgIH0pXG4gICAgfSlcblxuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgc2hvd1NpdGVtYXBFeHBvcnREYXRhQ3N2UGFuZWw6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNldEFjdGl2ZU5hdmlnYXRpb25CdXR0b24oJ3NpdGVtYXAtZXhwb3J0LWRhdGEtY3N2JylcblxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgIHZhciBleHBvcnRQYW5lbCA9IGljaC5TaXRlbWFwRXhwb3J0RGF0YUNTVihzaXRlbWFwKVxuICAgIHRoaXMuJCgnI3ZpZXdwb3J0JykuaHRtbChleHBvcnRQYW5lbClcblxuXHRcdC8vIGdlbmVyYXRlIGRhdGFcbiAgICB0aGlzLiQoJy5kb3dubG9hZC1idXR0b24nKS5oaWRlKClcbiAgICB0aGlzLnN0b3JlLmdldFNpdGVtYXBEYXRhKHNpdGVtYXAsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICB2YXIgYmxvYiA9IHNpdGVtYXAuZ2V0RGF0YUV4cG9ydENzdkJsb2IoZGF0YSlcbiAgICAgIHRoaXMuJCgnLmRvd25sb2FkLWJ1dHRvbiBhJykuYXR0cignaHJlZicsIHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpKVxuICAgICAgdGhpcy4kKCcuZG93bmxvYWQtYnV0dG9uIGEnKS5hdHRyKCdkb3dubG9hZCcsIHNpdGVtYXAuX2lkICsgJy5jc3YnKVxuICAgICAgdGhpcy4kKCcuZG93bmxvYWQtYnV0dG9uJykuc2hvdygpXG4gICAgfSlcblxuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgc2VsZWN0U2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnRcbiAgICB2YXIgd2luZG93ID0gdGhpcy53aW5kb3dcbiAgICB2YXIgaW5wdXQgPSAkKGJ1dHRvbikuY2xvc2VzdCgnLmZvcm0tZ3JvdXAnKS5maW5kKCdpbnB1dC5zZWxlY3Rvci12YWx1ZScpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzKVxuXG4gICAgdmFyIGRlZmVycmVkU2VsZWN0b3IgPSB0aGlzLmNvbnRlbnRTY3JpcHQuc2VsZWN0U2VsZWN0b3Ioe1xuICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgYWxsb3dlZEVsZW1lbnRzOiBzZWxlY3Rvci5nZXRJdGVtQ1NTU2VsZWN0b3IoKVxuICAgIH0sIHskLCBkb2N1bWVudCwgd2luZG93fSlcblxuICAgIGRlZmVycmVkU2VsZWN0b3IuZG9uZShmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAkKGlucHV0KS52YWwocmVzdWx0LkNTU1NlbGVjdG9yKVxuXG5cdFx0XHQvLyB1cGRhdGUgdmFsaWRhdGlvbiBmb3Igc2VsZWN0b3IgZmllbGRcbiAgICAgIHZhciB2YWxpZGF0b3IgPSB0aGlzLmdldEZvcm1WYWxpZGF0b3IoKVxuICAgICAgdmFsaWRhdG9yLnJldmFsaWRhdGVGaWVsZChpbnB1dClcblxuXHRcdFx0Ly8gQFRPRE8gaG93IGNvdWxkIHRoaXMgYmUgZW5jYXBzdWxhdGVkP1xuXHRcdFx0Ly8gdXBkYXRlIGhlYWRlciByb3csIGRhdGEgcm93IHNlbGVjdG9ycyBhZnRlciBzZWxlY3RpbmcgdGhlIHRhYmxlLiBzZWxlY3RvcnMgYXJlIHVwZGF0ZWQgYmFzZWQgb24gdGFibGVzXG5cdFx0XHQvLyBpbm5lciBodG1sXG4gICAgICBpZiAoc2VsZWN0b3IudHlwZSA9PT0gJ1NlbGVjdG9yVGFibGUnKSB7XG4gICAgICAgIHRoaXMuZ2V0U2VsZWN0b3JIVE1MKCkuZG9uZShmdW5jdGlvbiAoaHRtbCkge1xuICAgICAgICAgIHZhciB0YWJsZUhlYWRlclJvd1NlbGVjdG9yID0gU2VsZWN0b3JUYWJsZS5nZXRUYWJsZUhlYWRlclJvd1NlbGVjdG9yRnJvbVRhYmxlSFRNTChodG1sLCB7JCwgZG9jdW1lbnQsIHdpbmRvd30pXG4gICAgICAgICAgdmFyIHRhYmxlRGF0YVJvd1NlbGVjdG9yID0gU2VsZWN0b3JUYWJsZS5nZXRUYWJsZURhdGFSb3dTZWxlY3RvckZyb21UYWJsZUhUTUwoaHRtbCwgeyQsIGRvY3VtZW50LCB3aW5kb3d9KVxuICAgICAgICAgICQoJ2lucHV0W25hbWU9dGFibGVIZWFkZXJSb3dTZWxlY3Rvcl0nKS52YWwodGFibGVIZWFkZXJSb3dTZWxlY3RvcilcbiAgICAgICAgICAkKCdpbnB1dFtuYW1lPXRhYmxlRGF0YVJvd1NlbGVjdG9yXScpLnZhbCh0YWJsZURhdGFSb3dTZWxlY3RvcilcblxuICAgICAgICAgIHZhciBoZWFkZXJDb2x1bW5zID0gU2VsZWN0b3JUYWJsZS5nZXRUYWJsZUhlYWRlckNvbHVtbnNGcm9tSFRNTCh0YWJsZUhlYWRlclJvd1NlbGVjdG9yLCBodG1sLCB7JCwgZG9jdW1lbnQsIHdpbmRvd30pXG4gICAgICAgICAgdGhpcy5yZW5kZXJUYWJsZUhlYWRlckNvbHVtbnMoaGVhZGVyQ29sdW1ucylcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuICBnZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuc3RhdGUuZWRpdFNpdGVtYXBCcmVhZGN1bWJzU2VsZWN0b3JzLm1hcChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIHJldHVybiBzZWxlY3Rvci5pZFxuICAgIH0pXG5cbiAgICByZXR1cm4gcGFyZW50U2VsZWN0b3JJZHNcbiAgfSxcblxuICBzZWxlY3RUYWJsZUhlYWRlclJvd1NlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG4gICAgdmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gICAgdmFyIGlucHV0ID0gJChidXR0b24pLmNsb3Nlc3QoJy5mb3JtLWdyb3VwJykuZmluZCgnaW5wdXQuc2VsZWN0b3ItdmFsdWUnKVxuICAgIHZhciBzaXRlbWFwID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXAoKVxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgIHZhciBwYXJlbnRDU1NTZWxlY3RvciA9IHNpdGVtYXAuc2VsZWN0b3JzLmdldENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShzZWxlY3Rvci5pZCwgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG5cbiAgICB2YXIgZGVmZXJyZWRTZWxlY3RvciA9IHRoaXMuY29udGVudFNjcmlwdC5zZWxlY3RTZWxlY3Rvcih7XG4gICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcGFyZW50Q1NTU2VsZWN0b3IsXG4gICAgICBhbGxvd2VkRWxlbWVudHM6ICd0cidcbiAgICB9LCB7JCwgZG9jdW1lbnQsIHdpbmRvd30pXG5cbiAgICBkZWZlcnJlZFNlbGVjdG9yLmRvbmUoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgdmFyIHRhYmxlSGVhZGVyUm93U2VsZWN0b3IgPSByZXN1bHQuQ1NTU2VsZWN0b3JcbiAgICAgICQoaW5wdXQpLnZhbCh0YWJsZUhlYWRlclJvd1NlbGVjdG9yKVxuXG4gICAgICB0aGlzLmdldFNlbGVjdG9ySFRNTCgpLmRvbmUoZnVuY3Rpb24gKGh0bWwpIHtcbiAgICAgICAgdmFyIGhlYWRlckNvbHVtbnMgPSBTZWxlY3RvclRhYmxlLmdldFRhYmxlSGVhZGVyQ29sdW1uc0Zyb21IVE1MKHRhYmxlSGVhZGVyUm93U2VsZWN0b3IsIGh0bWwsIHskLCBkb2N1bWVudCwgd2luZG93fSlcbiAgICAgICAgdGhpcy5yZW5kZXJUYWJsZUhlYWRlckNvbHVtbnMoaGVhZGVyQ29sdW1ucylcbiAgICAgIH0uYmluZCh0aGlzKSlcblxuXHRcdFx0Ly8gdXBkYXRlIHZhbGlkYXRpb24gZm9yIHNlbGVjdG9yIGZpZWxkXG4gICAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICAgIHZhbGlkYXRvci5yZXZhbGlkYXRlRmllbGQoaW5wdXQpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9LFxuXG4gIHNlbGVjdFRhYmxlRGF0YVJvd1NlbGVjdG9yOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG4gICAgdmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gICAgdmFyIGlucHV0ID0gdGhpcy4kKGJ1dHRvbikuY2xvc2VzdCgnLmZvcm0tZ3JvdXAnKS5maW5kKCdpbnB1dC5zZWxlY3Rvci12YWx1ZScpXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKHNlbGVjdG9yLmlkLCBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcblxuICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yID0gdGhpcy5jb250ZW50U2NyaXB0LnNlbGVjdFNlbGVjdG9yKHtcbiAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgIGFsbG93ZWRFbGVtZW50czogJ3RyJ1xuICAgIH0sIHskLCBkb2N1bWVudCwgd2luZG93fSlcblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIGRlZmVycmVkU2VsZWN0b3IuZG9uZShmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICBpZiAoIXJlc3VsdCkgcmV0dXJuIGNvbnNvbGUuZXJyb3IobmV3IEVycm9yKCdyZXN1bHQgc2hvdWxkIG5vdCBiZSBudWxsJykpXG4gICAgICBzZWxmLiQoaW5wdXQpLnZhbChyZXN1bHQuQ1NTU2VsZWN0b3IpXG5cblx0XHRcdC8vIHVwZGF0ZSB2YWxpZGF0aW9uIGZvciBzZWxlY3RvciBmaWVsZFxuICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICB2YWxpZGF0b3IucmV2YWxpZGF0ZUZpZWxkKGlucHV0KVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfSxcblxuXHQvKipcblx0ICogdXBkYXRlIHRhYmxlIHNlbGVjdG9yIGNvbHVtbiBlZGl0aW5nIGZpZWxkc1xuXHQgKi9cbiAgcmVuZGVyVGFibGVIZWFkZXJDb2x1bW5zOiBmdW5jdGlvbiAoaGVhZGVyQ29sdW1ucykge1xuXHRcdC8vIHJlc2V0IHByZXZpb3VzIGNvbHVtbnNcbiAgICB2YXIgJHRib2R5ID0gdGhpcy4kKCcuZmVhdHVyZS1jb2x1bW5zIHRhYmxlIHRib2R5JylcbiAgICAkdGJvZHkuaHRtbCgnJylcbiAgICBoZWFkZXJDb2x1bW5zLmZvckVhY2goZnVuY3Rpb24gKGNvbHVtbikge1xuICAgICAgdmFyICRyb3cgPSBpY2guU2VsZWN0b3JFZGl0VGFibGVDb2x1bW4oY29sdW1uKVxuICAgICAgJHRib2R5LmFwcGVuZCgkcm93KVxuICAgIH0pXG4gIH0sXG5cblx0LyoqXG5cdCAqIFJldHVybnMgSFRNTCB0aGF0IHRoZSBjdXJyZW50IHNlbGVjdG9yIHdvdWxkIHNlbGVjdFxuXHQgKi9cbiAgZ2V0U2VsZWN0b3JIVE1MOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbnZhciBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnRcbnZhciB3aW5kb3cgPSB0aGlzLndpbmRvd1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvclNpdGVtYXAoKVxuICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgIHZhciBDU1NTZWxlY3RvciA9IHNpdGVtYXAuc2VsZWN0b3JzLmdldENTU1NlbGVjdG9yV2l0aGluT25lUGFnZShzZWxlY3Rvci5pZCwgY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG4gICAgdmFyIGRlZmVycmVkSFRNTCA9IHRoaXMuY29udGVudFNjcmlwdC5nZXRIVE1MKHtDU1NTZWxlY3RvcjogQ1NTU2VsZWN0b3J9LCB7JCwgZG9jdW1lbnQsIHdpbmRvd30pXG5cbiAgICByZXR1cm4gZGVmZXJyZWRIVE1MXG4gIH0sXG4gIHByZXZpZXdTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciAkID0gdGhpcy4kXG52YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG52YXIgd2luZG93ID0gdGhpcy53aW5kb3dcbiAgICBpZiAoISQoYnV0dG9uKS5oYXNDbGFzcygncHJldmlldycpKSB7XG4gICAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3JTaXRlbWFwKClcbiAgICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UoY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSB0aGlzLmNvbnRlbnRTY3JpcHQucHJldmlld1NlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBlbGVtZW50Q1NTU2VsZWN0b3I6IHNlbGVjdG9yLnNlbGVjdG9yXG4gICAgICB9LCB7JCwgZG9jdW1lbnQsIHdpbmRvd30pXG5cbiAgICAgIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3LmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGJ1dHRvbikuYWRkQ2xhc3MoJ3ByZXZpZXcnKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKVxuICAgICAgJChidXR0b24pLnJlbW92ZUNsYXNzKCdwcmV2aWV3JylcbiAgICB9XG4gIH0sXG4gIHByZXZpZXdDbGlja0VsZW1lbnRTZWxlY3RvcjogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciAkID0gdGhpcy4kXG52YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG52YXIgd2luZG93ID0gdGhpcy53aW5kb3dcbiAgICBpZiAoISQoYnV0dG9uKS5oYXNDbGFzcygncHJldmlldycpKSB7XG4gICAgICB2YXIgc2l0ZW1hcCA9IHRoaXMuc3RhdGUuY3VycmVudFNpdGVtYXBcbiAgICAgIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0Q3VycmVudGx5RWRpdGVkU2VsZWN0b3IoKVxuICAgICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UoY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG5cbiAgICAgIHZhciBkZWZlcnJlZFNlbGVjdG9yUHJldmlldyA9IHRoaXMuY29udGVudFNjcmlwdC5wcmV2aWV3U2VsZWN0b3Ioe1xuICAgICAgICBwYXJlbnRDU1NTZWxlY3RvcjogcGFyZW50Q1NTU2VsZWN0b3IsXG4gICAgICAgIGVsZW1lbnRDU1NTZWxlY3Rvcjogc2VsZWN0b3IuY2xpY2tFbGVtZW50U2VsZWN0b3JcbiAgICAgIH0sIHskLCBkb2N1bWVudCwgd2luZG93fSlcblxuICAgICAgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoYnV0dG9uKS5hZGRDbGFzcygncHJldmlldycpXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbnRlbnRTY3JpcHQucmVtb3ZlQ3VycmVudENvbnRlbnRTZWxlY3RvcigpXG4gICAgICAkKGJ1dHRvbikucmVtb3ZlQ2xhc3MoJ3ByZXZpZXcnKVxuICAgIH1cbiAgfSxcbiAgcHJldmlld1RhYmxlUm93U2VsZWN0b3I6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxudmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxudmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gICAgaWYgKCEkKGJ1dHRvbikuaGFzQ2xhc3MoJ3ByZXZpZXcnKSkge1xuICAgICAgdmFyIHNpdGVtYXAgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yU2l0ZW1hcCgpXG4gICAgICB2YXIgc2VsZWN0b3IgPSB0aGlzLmdldEN1cnJlbnRseUVkaXRlZFNlbGVjdG9yKClcbiAgICAgIHZhciBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0Q3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMoKVxuICAgICAgdmFyIHBhcmVudENTU1NlbGVjdG9yID0gc2l0ZW1hcC5zZWxlY3RvcnMuZ2V0Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKHNlbGVjdG9yLmlkLCBjdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcylcbiAgICAgIHZhciByb3dTZWxlY3RvciA9ICQoYnV0dG9uKS5jbG9zZXN0KCcuZm9ybS1ncm91cCcpLmZpbmQoJ2lucHV0JykudmFsKClcblxuICAgICAgdmFyIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3ID0gdGhpcy5jb250ZW50U2NyaXB0LnByZXZpZXdTZWxlY3Rvcih7XG4gICAgICAgIHBhcmVudENTU1NlbGVjdG9yOiBwYXJlbnRDU1NTZWxlY3RvcixcbiAgICAgICAgZWxlbWVudENTU1NlbGVjdG9yOiByb3dTZWxlY3RvclxuICAgICAgfSwgeyQsIGRvY3VtZW50LCB3aW5kb3d9KVxuXG4gICAgICBkZWZlcnJlZFNlbGVjdG9yUHJldmlldy5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJChidXR0b24pLmFkZENsYXNzKCdwcmV2aWV3JylcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29udGVudFNjcmlwdC5yZW1vdmVDdXJyZW50Q29udGVudFNlbGVjdG9yKClcbiAgICAgICQoYnV0dG9uKS5yZW1vdmVDbGFzcygncHJldmlldycpXG4gICAgfVxuICB9LFxuICBwcmV2aWV3U2VsZWN0b3JGcm9tU2VsZWN0b3JUcmVlOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbnZhciBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnRcbnZhciB3aW5kb3cgPSB0aGlzLndpbmRvd1xuICAgIGlmICghJChidXR0b24pLmhhc0NsYXNzKCdwcmV2aWV3JykpIHtcbiAgICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcFxuICAgICAgdmFyIHNlbGVjdG9yID0gJChidXR0b24pLmNsb3Nlc3QoJ3RyJykuZGF0YSgnc2VsZWN0b3InKVxuICAgICAgdmFyIGN1cnJlbnRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzID0gdGhpcy5nZXRDdXJyZW50U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG4gICAgICB2YXIgcGFyZW50Q1NTU2VsZWN0b3IgPSBzaXRlbWFwLnNlbGVjdG9ycy5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UoY3VycmVudFN0YXRlUGFyZW50U2VsZWN0b3JJZHMpXG4gICAgICB2YXIgZGVmZXJyZWRTZWxlY3RvclByZXZpZXcgPSB0aGlzLmNvbnRlbnRTY3JpcHQucHJldmlld1NlbGVjdG9yKHtcbiAgICAgICAgcGFyZW50Q1NTU2VsZWN0b3I6IHBhcmVudENTU1NlbGVjdG9yLFxuICAgICAgICBlbGVtZW50Q1NTU2VsZWN0b3I6IHNlbGVjdG9yLnNlbGVjdG9yXG4gICAgICB9LCB7JCwgZG9jdW1lbnQsIHdpbmRvd30pXG5cbiAgICAgIGRlZmVycmVkU2VsZWN0b3JQcmV2aWV3LmRvbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAkKGJ1dHRvbikuYWRkQ2xhc3MoJ3ByZXZpZXcnKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb250ZW50U2NyaXB0LnJlbW92ZUN1cnJlbnRDb250ZW50U2VsZWN0b3IoKVxuICAgICAgJChidXR0b24pLnJlbW92ZUNsYXNzKCdwcmV2aWV3JylcbiAgICB9XG4gIH0sXG4gIHByZXZpZXdTZWxlY3RvckRhdGFGcm9tU2VsZWN0b3JUcmVlOiBmdW5jdGlvbiAoYnV0dG9uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIHNpdGVtYXAgPSB0aGlzLnN0YXRlLmN1cnJlbnRTaXRlbWFwXG4gICAgdmFyIHNlbGVjdG9yID0gc2VsZi4kKGJ1dHRvbikuY2xvc2VzdCgndHInKS5kYXRhKCdzZWxlY3RvcicpXG4gICAgdGhpcy5wcmV2aWV3U2VsZWN0b3JEYXRhKHNpdGVtYXAsIHNlbGVjdG9yLmlkKVxuICB9LFxuICBwcmV2aWV3U2VsZWN0b3JEYXRhRnJvbVNlbGVjdG9yRWRpdGluZzogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzaXRlbWFwID0gdGhpcy5zdGF0ZS5jdXJyZW50U2l0ZW1hcC5jbG9uZSgpXG4gICAgdmFyIHNlbGVjdG9yID0gc2l0ZW1hcC5nZXRTZWxlY3RvckJ5SWQodGhpcy5zdGF0ZS5jdXJyZW50U2VsZWN0b3IuaWQpXG4gICAgdmFyIG5ld1NlbGVjdG9yID0gdGhpcy5nZXRDdXJyZW50bHlFZGl0ZWRTZWxlY3RvcigpXG4gICAgc2l0ZW1hcC51cGRhdGVTZWxlY3RvcihzZWxlY3RvciwgbmV3U2VsZWN0b3IpXG4gICAgdGhpcy5wcmV2aWV3U2VsZWN0b3JEYXRhKHNpdGVtYXAsIG5ld1NlbGVjdG9yLmlkKVxuICB9LFxuXHQvKipcblx0ICogUmV0dXJucyBhIGxpc3Qgb2Ygc2VsZWN0b3IgaWRzIHRoYXQgdGhlIHVzZXIgaGFzIG9wZW5lZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuICBnZXRTdGF0ZVBhcmVudFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhcmVudFNlbGVjdG9ySWRzID0gW11cbiAgICB0aGlzLnN0YXRlLmVkaXRTaXRlbWFwQnJlYWRjdW1ic1NlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgcGFyZW50U2VsZWN0b3JJZHMucHVzaChzZWxlY3Rvci5pZClcbiAgICB9KVxuICAgIHJldHVybiBwYXJlbnRTZWxlY3Rvcklkc1xuICB9LFxuICBwcmV2aWV3U2VsZWN0b3JEYXRhOiBmdW5jdGlvbiAoc2l0ZW1hcCwgc2VsZWN0b3JJZCkge1xuXHRcdC8vIGRhdGEgcHJldmlldyB3aWxsIGJlIGJhc2Ugb24gaG93IHRoZSBzZWxlY3RvciB0cmVlIGlzIG9wZW5lZFxuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkcyA9IHRoaXMuZ2V0U3RhdGVQYXJlbnRTZWxlY3RvcklkcygpXG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgcHJldmlld1NlbGVjdG9yRGF0YTogdHJ1ZSxcbiAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpLFxuICAgICAgcGFyZW50U2VsZWN0b3JJZHM6IHBhcmVudFNlbGVjdG9ySWRzLFxuICAgICAgc2VsZWN0b3JJZDogc2VsZWN0b3JJZFxuICAgIH1cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIGlmIChyZXNwb25zZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICB2YXIgZGF0YUNvbHVtbnMgPSBPYmplY3Qua2V5cyhyZXNwb25zZVswXSlcblxuICAgICAgY29uc29sZS5sb2coZGF0YUNvbHVtbnMpXG5cbiAgICAgIHZhciAkZGF0YVByZXZpZXdQYW5lbCA9IGljaC5EYXRhUHJldmlldyh7XG4gICAgICAgIGNvbHVtbnM6IGRhdGFDb2x1bW5zXG4gICAgICB9KVxuICAgICAgc2VsZi4kKCcjdmlld3BvcnQnKS5hcHBlbmQoJGRhdGFQcmV2aWV3UGFuZWwpXG4gICAgICAkZGF0YVByZXZpZXdQYW5lbC5tb2RhbCgnc2hvdycpXG5cdFx0XHQvLyBkaXNwbGF5IGRhdGFcblx0XHRcdC8vIERvaW5nIHRoaXMgdGhlIGxvbmcgd2F5IHNvIHRoZXJlIGFyZW4ndCB4c3MgdnVsbmVydWJpbGl0ZXNcblx0XHRcdC8vIHdoaWxlIHdvcmtpbmcgd2l0aCBkYXRhIG9yIHdpdGggdGhlIHNlbGVjdG9yIHRpdGxlc1xuICAgICAgdmFyICR0Ym9keSA9IHNlbGYuJCgndGJvZHknLCAkZGF0YVByZXZpZXdQYW5lbClcbiAgICAgIHJlc3BvbnNlLmZvckVhY2goZnVuY3Rpb24gKHJvdykge1xuICAgICAgICB2YXIgJHRyID0gc2VsZi4kKCc8dHI+PC90cj4nKVxuICAgICAgICBkYXRhQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgICAgICB2YXIgJHRkID0gc2VsZi4kKCc8dGQ+PC90ZD4nKVxuICAgICAgICAgIHZhciBjZWxsRGF0YSA9IHJvd1tjb2x1bW5dXG4gICAgICAgICAgaWYgKHR5cGVvZiBjZWxsRGF0YSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNlbGxEYXRhID0gSlNPTi5zdHJpbmdpZnkoY2VsbERhdGEpXG4gICAgICAgICAgfVxuICAgICAgICAgICR0ZC50ZXh0KGNlbGxEYXRhKVxuICAgICAgICAgICR0ci5hcHBlbmQoJHRkKVxuICAgICAgICB9KVxuICAgICAgICAkdGJvZHkuYXBwZW5kKCR0cilcbiAgICAgIH0pXG5cbiAgICAgIHZhciB3aW5kb3dIZWlnaHQgPSBzZWxmLiQod2luZG93KS5oZWlnaHQoKVxuXG4gICAgICBzZWxmLiQoJy5kYXRhLXByZXZpZXctbW9kYWwgLm1vZGFsLWJvZHknKS5oZWlnaHQod2luZG93SGVpZ2h0IC0gMTMwKVxuXG5cdFx0XHQvLyByZW1vdmUgbW9kYWwgZnJvbSBkb20gYWZ0ZXIgaXQgaXMgY2xvc2VkXG4gICAgICAkZGF0YVByZXZpZXdQYW5lbC5vbignaGlkZGVuLmJzLm1vZGFsJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLiQodGhpcykucmVtb3ZlKClcbiAgICAgIH0pXG4gICAgfSlcbiAgfSxcblx0LyoqXG5cdCAqIEFkZCBzdGFydCB1cmwgdG8gc2l0ZW1hcCBjcmVhdGlvbiBvciBlZGl0aW5nIGZvcm1cblx0ICogQHBhcmFtIGJ1dHRvblxuXHQgKi9cbiAgYWRkU3RhcnRVcmw6IGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB2YXIgJHN0YXJ0VXJsSW5wdXRGaWVsZCA9IGljaC5TaXRlbWFwU3RhcnRVcmxGaWVsZCgpXG4gICAgc2VsZi4kKCcjdmlld3BvcnQgLnN0YXJ0LXVybC1ibG9jazpsYXN0JykuYWZ0ZXIoJHN0YXJ0VXJsSW5wdXRGaWVsZClcbiAgICB2YXIgdmFsaWRhdG9yID0gdGhpcy5nZXRGb3JtVmFsaWRhdG9yKClcbiAgICB2YWxpZGF0b3IuYWRkRmllbGQoJHN0YXJ0VXJsSW5wdXRGaWVsZC5maW5kKCdpbnB1dCcpKVxuICB9LFxuXHQvKipcblx0ICogUmVtb3ZlIHN0YXJ0IHVybCBmcm9tIHNpdGVtYXAgY3JlYXRpb24gb3IgZWRpdGluZyBmb3JtLlxuXHQgKiBAcGFyYW0gYnV0dG9uXG5cdCAqL1xuICByZW1vdmVTdGFydFVybDogZnVuY3Rpb24gKGJ1dHRvbikge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHZhciAkYmxvY2sgPSBzZWxmLiQoYnV0dG9uKS5jbG9zZXN0KCcuc3RhcnQtdXJsLWJsb2NrJylcbiAgICBpZiAoc2VsZi4kKCcjdmlld3BvcnQgLnN0YXJ0LXVybC1ibG9jaycpLmxlbmd0aCA+IDEpIHtcblx0XHRcdC8vIHJlbW92ZSBmcm9tIHZhbGlkYXRvclxuICAgICAgdmFyIHZhbGlkYXRvciA9IHRoaXMuZ2V0Rm9ybVZhbGlkYXRvcigpXG4gICAgICB2YWxpZGF0b3IucmVtb3ZlRmllbGQoJGJsb2NrLmZpbmQoJ2lucHV0JykpXG5cbiAgICAgICRibG9jay5yZW1vdmUoKVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpdGVtYXBDb250cm9sbGVyXG4iLCIvKipcbiAqIEVsZW1lbnQgc2VsZWN0b3IuIFVzZXMgalF1ZXJ5IGFzIGJhc2UgYW5kIGFkZHMgc29tZSBtb3JlIGZlYXR1cmVzXG4gKiBAcGFyYW0gQ1NTU2VsZWN0b3JcbiAqIEBwYXJhbSBwYXJlbnRFbGVtZW50XG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG52YXIgRWxlbWVudFF1ZXJ5ID0gZnVuY3Rpb24gKENTU1NlbGVjdG9yLCBwYXJlbnRFbGVtZW50LCBvcHRpb25zKSB7XG4gIENTU1NlbGVjdG9yID0gQ1NTU2VsZWN0b3IgfHwgJydcbiAgdGhpcy4kID0gb3B0aW9ucy4kXG50aGlzLmRvY3VtZW50ID0gb3B0aW9ucy5kb2N1bWVudFxudGhpcy53aW5kb3cgPSBvcHRpb25zLndpbmRvd1xuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeSBmb3IgRWxlbWVudFF1ZXJ5JylcbmlmICghdGhpcy5kb2N1bWVudCkgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBkb2N1bWVudFwiKVxuaWYoIXRoaXMud2luZG93KXRocm93IG5ldyBFcnJvcihcIk1pc3Npbmcgd2luZG93XCIpXG4gIHZhciBzZWxlY3RlZEVsZW1lbnRzID0gW11cblxuICB2YXIgYWRkRWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgaWYgKHNlbGVjdGVkRWxlbWVudHMuaW5kZXhPZihlbGVtZW50KSA9PT0gLTEpIHtcbiAgICAgIHNlbGVjdGVkRWxlbWVudHMucHVzaChlbGVtZW50KVxuICAgIH1cbiAgfVxuXG4gIHZhciBzZWxlY3RvclBhcnRzID0gRWxlbWVudFF1ZXJ5LmdldFNlbGVjdG9yUGFydHMoQ1NTU2VsZWN0b3IpXG4gIHZhciBzZWxmID0gdGhpc1xuICBzZWxlY3RvclBhcnRzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG5cdFx0Ly8gaGFuZGxlIHNwZWNpYWwgY2FzZSB3aGVuIHBhcmVudCBpcyBzZWxlY3RlZFxuICAgIGlmIChzZWxlY3RvciA9PT0gJ19wYXJlbnRfJykge1xuICAgICAgc2VsZi4kKHBhcmVudEVsZW1lbnQpLmVhY2goZnVuY3Rpb24gKGksIGVsZW1lbnQpIHtcbiAgICAgICAgYWRkRWxlbWVudChlbGVtZW50KVxuICAgICAgfSlcbiAgICB9XHRcdGVsc2Uge1xuICAgICAgdmFyIGVsZW1lbnRzID0gc2VsZi4kKHNlbGVjdG9yLCBzZWxmLiQocGFyZW50RWxlbWVudCkpXG4gICAgICBlbGVtZW50cy5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIGFkZEVsZW1lbnQoZWxlbWVudClcbiAgICAgIH0pXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiBzZWxlY3RlZEVsZW1lbnRzXG59XG5cbkVsZW1lbnRRdWVyeS5nZXRTZWxlY3RvclBhcnRzID0gZnVuY3Rpb24gKENTU1NlbGVjdG9yKSB7XG4gIHZhciBzZWxlY3RvcnMgPSBDU1NTZWxlY3Rvci5zcGxpdCgvKCx8XCIuKj9cInwnLio/J3xcXCguKj9cXCkpLylcblxuICB2YXIgcmVzdWx0U2VsZWN0b3JzID0gW11cbiAgdmFyIGN1cnJlbnRTZWxlY3RvciA9ICcnXG4gIHNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIGlmIChzZWxlY3RvciA9PT0gJywnKSB7XG4gICAgICBpZiAoY3VycmVudFNlbGVjdG9yLnRyaW0oKS5sZW5ndGgpIHtcbiAgICAgICAgcmVzdWx0U2VsZWN0b3JzLnB1c2goY3VycmVudFNlbGVjdG9yLnRyaW0oKSlcbiAgICAgIH1cbiAgICAgIGN1cnJlbnRTZWxlY3RvciA9ICcnXG4gICAgfVx0XHRlbHNlIHtcbiAgICAgIGN1cnJlbnRTZWxlY3RvciArPSBzZWxlY3RvclxuICAgIH1cbiAgfSlcbiAgaWYgKGN1cnJlbnRTZWxlY3Rvci50cmltKCkubGVuZ3RoKSB7XG4gICAgcmVzdWx0U2VsZWN0b3JzLnB1c2goY3VycmVudFNlbGVjdG9yLnRyaW0oKSlcbiAgfVxuXG4gIHJldHVybiByZXN1bHRTZWxlY3RvcnNcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFbGVtZW50UXVlcnlcbiIsInZhciBzZWxlY3RvcnMgPSByZXF1aXJlKCcuL1NlbGVjdG9ycycpXG52YXIgRWxlbWVudFF1ZXJ5ID0gcmVxdWlyZSgnLi9FbGVtZW50UXVlcnknKVxudmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG5cbnZhciBTZWxlY3RvciA9IGZ1bmN0aW9uIChzZWxlY3Rvciwgb3B0aW9ucykge1xuICB2YXIgJCA9IG9wdGlvbnMuJFxuICB2YXIgZG9jdW1lbnQgPSBvcHRpb25zLmRvY3VtZW50XG4gIHZhciB3aW5kb3cgPSBvcHRpb25zLndpbmRvd1xuICAvLyBXZSBkb24ndCB3YW50IGVudW1lcmFibGUgcHJvcGVydGllc1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJyQnLCB7XG4gICAgdmFsdWU6ICQsXG4gICAgZW51bWVyYWJsZTogZmFsc2VcbiAgfSlcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd3aW5kb3cnLCB7XG4gICAgdmFsdWU6IHdpbmRvdyxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICB9KVxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2RvY3VtZW50Jywge1xuICAgIHZhbHVlOiBkb2N1bWVudCxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICB9KVxuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGpxdWVyeScpXG4gIGlmICghdGhpcy5kb2N1bWVudCkgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBkb2N1bWVudFwiKVxuICBpZighdGhpcy53aW5kb3cpdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB3aW5kb3dcIilcblxuICB0aGlzLnVwZGF0ZURhdGEoc2VsZWN0b3IpXG4gIHRoaXMuaW5pdFR5cGUoKVxufVxuXG5TZWxlY3Rvci5wcm90b3R5cGUgPSB7XG5cblx0LyoqXG5cdCAqIElzIHRoaXMgc2VsZWN0b3IgY29uZmlndXJlZCB0byByZXR1cm4gbXVsdGlwbGUgaXRlbXM/XG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cbiAgd2lsbFJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmNhblJldHVybk11bHRpcGxlUmVjb3JkcygpICYmIHRoaXMubXVsdGlwbGVcbiAgfSxcblxuXHQvKipcblx0ICogVXBkYXRlIGN1cnJlbnQgc2VsZWN0b3IgY29uZmlndXJhdGlvblxuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKi9cbiAgdXBkYXRlRGF0YTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgYWxsb3dlZEtleXMgPSBbJ3dpbmRvdycsICdkb2N1bWVudCcsICdpZCcsICd0eXBlJywgJ3NlbGVjdG9yJywgJ3BhcmVudFNlbGVjdG9ycyddXG4gICAgY29uc29sZS5sb2coJ2RhdGEgdHlwZScsIGRhdGEudHlwZSlcbiAgICBhbGxvd2VkS2V5cyA9IGFsbG93ZWRLZXlzLmNvbmNhdChzZWxlY3RvcnNbZGF0YS50eXBlXS5nZXRGZWF0dXJlcygpKVxuICAgIHZhciBrZXlcblx0XHQvLyB1cGRhdGUgZGF0YVxuICAgIGZvciAoa2V5IGluIGRhdGEpIHtcbiAgICAgIGlmIChhbGxvd2VkS2V5cy5pbmRleE9mKGtleSkgIT09IC0xIHx8IHR5cGVvZiBkYXRhW2tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpc1trZXldID0gZGF0YVtrZXldXG4gICAgICB9XG4gICAgfVxuXG5cdFx0Ly8gcmVtb3ZlIHZhbHVlcyB0aGF0IGFyZSBub3QgbmVlZGVkIGZvciB0aGlzIHR5cGUgb2Ygc2VsZWN0b3JcbiAgICBmb3IgKGtleSBpbiB0aGlzKSB7XG4gICAgICBpZiAoYWxsb3dlZEtleXMuaW5kZXhPZihrZXkpID09PSAtMSAmJiB0eXBlb2YgdGhpc1trZXldICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzW2tleV1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENTUyBzZWxlY3RvciB3aGljaCB3aWxsIGJlIHVzZWQgZm9yIGVsZW1lbnQgc2VsZWN0aW9uXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9XG5cdCAqL1xuICBnZXRJdGVtQ1NTU2VsZWN0b3I6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJyonXG4gIH0sXG5cblx0LyoqXG5cdCAqIG92ZXJyaWRlIG9iamVjdHMgbWV0aG9kcyBiYXNlZCBvbiBzZWxldG9yIHR5cGVcblx0ICovXG4gIGluaXRUeXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHNlbGVjdG9yc1t0aGlzLnR5cGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU2VsZWN0b3IgdHlwZSBub3QgZGVmaW5lZCAnICsgdGhpcy50eXBlKVxuICAgIH1cblxuXHRcdC8vIG92ZXJyaWRlcyBvYmplY3RzIG1ldGhvZHNcbiAgICBmb3IgKHZhciBpIGluIHNlbGVjdG9yc1t0aGlzLnR5cGVdKSB7XG4gICAgICB0aGlzW2ldID0gc2VsZWN0b3JzW3RoaXMudHlwZV1baV1cbiAgICB9XG4gIH0sXG5cblx0LyoqXG5cdCAqIENoZWNrIHdoZXRoZXIgYSBzZWxlY3RvciBpcyBhIHBhcmVuIHNlbGVjdG9yIG9mIHRoaXMgc2VsZWN0b3Jcblx0ICogQHBhcmFtIHNlbGVjdG9ySWRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuICBoYXNQYXJlbnRTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gKHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZCkgIT09IC0xKVxuICB9LFxuXG4gIHJlbW92ZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuICAgIHZhciBpbmRleCA9IHRoaXMucGFyZW50U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3JJZClcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICB0aGlzLnBhcmVudFNlbGVjdG9ycy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICB9LFxuXG4gIHJlbmFtZVBhcmVudFNlbGVjdG9yOiBmdW5jdGlvbiAob3JpZ2luYWxJZCwgcmVwbGFjZW1lbnRJZCkge1xuICAgIGlmICh0aGlzLmhhc1BhcmVudFNlbGVjdG9yKG9yaWdpbmFsSWQpKSB7XG4gICAgICB2YXIgcG9zID0gdGhpcy5wYXJlbnRTZWxlY3RvcnMuaW5kZXhPZihvcmlnaW5hbElkKVxuICAgICAgdGhpcy5wYXJlbnRTZWxlY3RvcnMuc3BsaWNlKHBvcywgMSwgcmVwbGFjZW1lbnRJZClcbiAgICB9XG4gIH0sXG5cbiAgZ2V0RGF0YUVsZW1lbnRzOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxuICAgIHZhciB3aW5kb3cgPSB0aGlzLndpbmRvd1xuICAgIHZhciBlbGVtZW50cyA9IEVsZW1lbnRRdWVyeSh0aGlzLnNlbGVjdG9yLCBwYXJlbnRFbGVtZW50LCB7JCwgZG9jdW1lbnQsIHdpbmRvd30pXG4gICAgaWYgKHRoaXMubXVsdGlwbGUpIHtcbiAgICAgIHJldHVybiBlbGVtZW50c1xuICAgIH0gZWxzZSBpZiAoZWxlbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIFtlbGVtZW50c1swXV1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtdXG4gICAgfVxuICB9LFxuXG4gIGdldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciB0aW1lb3V0ID0gdGhpcy5kZWxheSB8fCAwXG5cblx0XHQvLyB0aGlzIHdvcmtzIG11Y2ggZmFzdGVyIGJlY2F1c2Ugd2hlbkNhbGxTZXF1ZW50YWxseSBpc24ndCBydW5uaW5nIG5leHQgZGF0YSBleHRyYWN0aW9uIGltbWVkaWF0ZWx5XG4gICAgaWYgKHRpbWVvdXQgPT09IDApIHtcbiAgICAgIHZhciBkZWZlcnJlZERhdGEgPSB0aGlzLl9nZXREYXRhKHBhcmVudEVsZW1lbnQpXG4gICAgICBkZWZlcnJlZERhdGEuZG9uZShmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBkLnJlc29sdmUoZGF0YSlcbiAgICAgIH0pXG4gICAgfVx0ZWxzZSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRlZmVycmVkRGF0YSA9IHRoaXMuX2dldERhdGEocGFyZW50RWxlbWVudClcbiAgICAgICAgZGVmZXJyZWREYXRhLmRvbmUoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICBkLnJlc29sdmUoZGF0YSlcbiAgICAgICAgfSlcbiAgICAgIH0uYmluZCh0aGlzKSwgdGltZW91dClcbiAgICB9XG5cbiAgICByZXR1cm4gZC5wcm9taXNlKClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcblxudmFyIFNlbGVjdG9yRWxlbWVudCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgIGRmZC5yZXNvbHZlKHRoaXMuJC5tYWtlQXJyYXkoZWxlbWVudHMpKVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JFbGVtZW50XG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUgPSB7XG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgc2VsZi4kKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG5cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSBzZWxmLiQoZWxlbWVudCkuYXR0cih0aGlzLmV4dHJhY3RBdHRyaWJ1dGUpXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIGRhdGFbdGhpcy5pZCArICctc3JjJ10gPSBudWxsXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH1cbiAgICBkZmQucmVzb2x2ZShyZXN1bHQpXG5cbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZXh0cmFjdEF0dHJpYnV0ZScsICdkZWxheSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGVcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFVuaXF1ZUVsZW1lbnRMaXN0ID0gcmVxdWlyZSgnLi8uLi9VbmlxdWVFbGVtZW50TGlzdCcpXG52YXIgRWxlbWVudFF1ZXJ5ID0gcmVxdWlyZSgnLi8uLi9FbGVtZW50UXVlcnknKVxudmFyIENzc1NlbGVjdG9yID0gcmVxdWlyZSgnY3NzLXNlbGVjdG9yJykuQ3NzU2VsZWN0b3JcbnZhciBTZWxlY3RvckVsZW1lbnRDbGljayA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBnZXRDbGlja0VsZW1lbnRzOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxuICAgIHZhciB3aW5kb3cgPSB0aGlzLndpbmRvd1xuICAgIHZhciBjbGlja0VsZW1lbnRzID0gRWxlbWVudFF1ZXJ5KHRoaXMuY2xpY2tFbGVtZW50U2VsZWN0b3IsIHBhcmVudEVsZW1lbnQsIHskLCBkb2N1bWVudCwgd2luZG93fSlcbiAgICByZXR1cm4gY2xpY2tFbGVtZW50c1xuICB9LFxuXG5cdC8qKlxuXHQgKiBDaGVjayB3aGV0aGVyIGVsZW1lbnQgaXMgc3RpbGwgcmVhY2hhYmxlIGZyb20gaHRtbC4gVXNlZnVsIHRvIGNoZWNrIHdoZXRoZXIgdGhlIGVsZW1lbnQgaXMgcmVtb3ZlZCBmcm9tIERPTS5cblx0ICogQHBhcmFtIGVsZW1lbnRcblx0ICovXG4gIGlzRWxlbWVudEluSFRNTDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gdGhpcy4kKGVsZW1lbnQpLmNsb3Nlc3QoJ2h0bWwnKS5sZW5ndGggIT09IDBcbiAgfSxcblxuICB0cmlnZ2VyQnV0dG9uQ2xpY2s6IGZ1bmN0aW9uIChjbGlja0VsZW1lbnQpIHtcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG4gICAgdmFyIGNzID0gbmV3IENzc1NlbGVjdG9yKHtcbiAgICAgIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjogZmFsc2UsXG4gICAgICBwYXJlbnQ6IHRoaXMuJCgnYm9keScpWzBdLFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIGNzc1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2NsaWNrRWxlbWVudF0pXG5cbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGNzc1NlbGVjdG9yKVswXS5jbGljaygpXG4vKiAgICAvLyB0aGlzIGZ1bmN0aW9uIHdpbGwgY2F0Y2ggd2luZG93Lm9wZW4gY2FsbCBhbmQgcGxhY2UgdGhlIHJlcXVlc3RlZCB1cmwgYXMgdGhlIGVsZW1lbnRzIGRhdGEgYXR0cmlidXRlXG4gICAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgc2NyaXB0LnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0J1xuICAgIHNjcmlwdC50ZXh0ID0gJycgK1xuXHRcdFx0JyhmdW5jdGlvbigpeyAnICtcblx0XHRcdFwidmFyIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnXCIgKyBjc3NTZWxlY3RvciArIFwiJylbMF07IFwiICtcblx0XHRcdCdlbC5jbGljaygpOyAnICtcblx0XHRcdCd9KSgpOydcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdCkqL1xuICB9LFxuXG4gIGdldENsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuICd1bmlxdWVUZXh0J1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZVxuICAgIH1cbiAgfSxcblxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnRcbiAgICB2YXIgd2luZG93ID0gdGhpcy53aW5kb3dcbiAgICB2YXIgZGVsYXkgPSBwYXJzZUludCh0aGlzLmRlbGF5KSB8fCAwXG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBmb3VuZEVsZW1lbnRzID0gbmV3IFVuaXF1ZUVsZW1lbnRMaXN0KCd1bmlxdWVUZXh0JywgeyQsIGRvY3VtZW50LCB3aW5kb3d9KVxuICAgIHZhciBjbGlja0VsZW1lbnRzID0gdGhpcy5nZXRDbGlja0VsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG4gICAgdmFyIGRvbmVDbGlja2luZ0VsZW1lbnRzID0gbmV3IFVuaXF1ZUVsZW1lbnRMaXN0KHRoaXMuZ2V0Q2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUoKSwgeyQsIGRvY3VtZW50LCB3aW5kb3d9KVxuXG5cdFx0Ly8gYWRkIGVsZW1lbnRzIHRoYXQgYXJlIGF2YWlsYWJsZSBiZWZvcmUgY2xpY2tpbmdcbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgIGVsZW1lbnRzLmZvckVhY2goZm91bmRFbGVtZW50cy5wdXNoLmJpbmQoZm91bmRFbGVtZW50cykpXG5cblx0XHQvLyBkaXNjYXJkIGluaXRpYWwgZWxlbWVudHNcbiAgICBpZiAodGhpcy5kaXNjYXJkSW5pdGlhbEVsZW1lbnRzKSB7XG4gICAgICBmb3VuZEVsZW1lbnRzID0gbmV3IFVuaXF1ZUVsZW1lbnRMaXN0KCd1bmlxdWVUZXh0JywgeyQsIGRvY3VtZW50LCB3aW5kb3d9KVxuICAgIH1cblxuXHRcdC8vIG5vIGVsZW1lbnRzIHRvIGNsaWNrIGF0IHRoZSBiZWdpbm5pbmdcbiAgICBpZiAoY2xpY2tFbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShmb3VuZEVsZW1lbnRzKVxuICAgICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gICAgfVxuXG5cdFx0Ly8gaW5pdGlhbCBjbGljayBhbmQgd2FpdFxuICAgIHZhciBjdXJyZW50Q2xpY2tFbGVtZW50ID0gY2xpY2tFbGVtZW50c1swXVxuICAgIHRoaXMudHJpZ2dlckJ1dHRvbkNsaWNrKGN1cnJlbnRDbGlja0VsZW1lbnQpXG4gICAgdmFyIG5leHRFbGVtZW50U2VsZWN0aW9uID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSArIGRlbGF5XG5cblx0XHQvLyBpbmZpbml0ZWx5IHNjcm9sbCBkb3duIGFuZCBmaW5kIGFsbCBpdGVtc1xuICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblx0XHRcdC8vIGZpbmQgdGhvc2UgY2xpY2sgZWxlbWVudHMgdGhhdCBhcmUgbm90IGluIHRoZSBibGFjayBsaXN0XG4gICAgICB2YXIgYWxsQ2xpY2tFbGVtZW50cyA9IHRoaXMuZ2V0Q2xpY2tFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgICAgY2xpY2tFbGVtZW50cyA9IFtdXG4gICAgICBhbGxDbGlja0VsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKCFkb25lQ2xpY2tpbmdFbGVtZW50cy5pc0FkZGVkKGVsZW1lbnQpKSB7XG4gICAgICAgICAgY2xpY2tFbGVtZW50cy5wdXNoKGVsZW1lbnQpXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXG5cdFx0XHQvLyBzbGVlcC4gd2FpdCB3aGVuIHRvIGV4dHJhY3QgbmV4dCBlbGVtZW50c1xuICAgICAgaWYgKG5vdyA8IG5leHRFbGVtZW50U2VsZWN0aW9uKSB7XG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwid2FpdFwiKTtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cblx0XHRcdC8vIGFkZCBuZXdseSBmb3VuZCBlbGVtZW50cyB0byBlbGVtZW50IGZvdW5kRWxlbWVudHMgYXJyYXkuXG4gICAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgICAgdmFyIGFkZGVkQW5FbGVtZW50ID0gZmFsc2VcbiAgICAgIGVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGFkZGVkID0gZm91bmRFbGVtZW50cy5wdXNoKGVsZW1lbnQpXG4gICAgICAgIGlmIChhZGRlZCkge1xuICAgICAgICAgIGFkZGVkQW5FbGVtZW50ID0gdHJ1ZVxuICAgICAgICB9XG4gICAgICB9KVxuXHRcdFx0Ly8gY29uc29sZS5sb2coXCJhZGRlZFwiLCBhZGRlZEFuRWxlbWVudCk7XG5cblx0XHRcdC8vIG5vIG5ldyBlbGVtZW50cyBmb3VuZC4gU3RvcCBjbGlja2luZyB0aGlzIGJ1dHRvblxuICAgICAgaWYgKCFhZGRlZEFuRWxlbWVudCkge1xuICAgICAgICBkb25lQ2xpY2tpbmdFbGVtZW50cy5wdXNoKGN1cnJlbnRDbGlja0VsZW1lbnQpXG4gICAgICB9XG5cblx0XHRcdC8vIGNvbnRpbnVlIGNsaWNraW5nIGFuZCBhZGQgZGVsYXksIGJ1dCBpZiB0aGVyZSBpcyBub3RoaW5nXG5cdFx0XHQvLyBtb3JlIHRvIGNsaWNrIHRoZSBmaW5pc2hcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwidG90YWwgYnV0dG9uc1wiLCBjbGlja0VsZW1lbnRzLmxlbmd0aClcbiAgICAgIGlmIChjbGlja0VsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoZm91bmRFbGVtZW50cylcbiAgICAgIH0gZWxzZSB7XG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwiY2xpY2tcIik7XG4gICAgICAgIGN1cnJlbnRDbGlja0VsZW1lbnQgPSBjbGlja0VsZW1lbnRzWzBdXG5cdFx0XHRcdC8vIGNsaWNrIG9uIGVsZW1lbnRzIG9ubHkgb25jZSBpZiB0aGUgdHlwZSBpcyBjbGlja29uY2VcbiAgICAgICAgaWYgKHRoaXMuY2xpY2tUeXBlID09PSAnY2xpY2tPbmNlJykge1xuICAgICAgICAgIGRvbmVDbGlja2luZ0VsZW1lbnRzLnB1c2goY3VycmVudENsaWNrRWxlbWVudClcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRyaWdnZXJCdXR0b25DbGljayhjdXJyZW50Q2xpY2tFbGVtZW50KVxuICAgICAgICBuZXh0RWxlbWVudFNlbGVjdGlvbiA9IG5vdyArIGRlbGF5XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpLCA1MClcblxuICAgIHJldHVybiBkZWZlcnJlZFJlc3BvbnNlLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheScsICdjbGlja0VsZW1lbnRTZWxlY3RvcicsICdjbGlja1R5cGUnLCAnZGlzY2FyZEluaXRpYWxFbGVtZW50cycsICdjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSddXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RvckVsZW1lbnRDbGlja1xuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JFbGVtZW50U2Nyb2xsID0ge1xuXG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuICBzY3JvbGxUb0JvdHRvbTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnRcbiAgICB3aW5kb3cuc2Nyb2xsVG8oMCwgZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQpXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZWxheSA9IHBhcnNlSW50KHRoaXMuZGVsYXkpIHx8IDBcbiAgICB2YXIgZGVmZXJyZWRSZXNwb25zZSA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIGZvdW5kRWxlbWVudHMgPSBbXVxuXG5cdFx0Ly8gaW5pdGlhbGx5IHNjcm9sbCBkb3duIGFuZCB3YWl0XG4gICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpXG4gICAgdmFyIG5leHRFbGVtZW50U2VsZWN0aW9uID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSArIGRlbGF5XG5cblx0XHQvLyBpbmZpbml0ZWx5IHNjcm9sbCBkb3duIGFuZCBmaW5kIGFsbCBpdGVtc1xuICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXG5cdFx0XHQvLyBzbGVlcC4gd2FpdCB3aGVuIHRvIGV4dHJhY3QgbmV4dCBlbGVtZW50c1xuICAgICAgaWYgKG5vdyA8IG5leHRFbGVtZW50U2VsZWN0aW9uKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuXHRcdFx0Ly8gbm8gbmV3IGVsZW1lbnRzIGZvdW5kXG4gICAgICBpZiAoZWxlbWVudHMubGVuZ3RoID09PSBmb3VuZEVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKVxuICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUodGhpcy4kLm1ha2VBcnJheShlbGVtZW50cykpXG4gICAgICB9IGVsc2Uge1xuXHRcdFx0XHQvLyBjb250aW51ZSBzY3JvbGxpbmcgYW5kIGFkZCBkZWxheVxuICAgICAgICBmb3VuZEVsZW1lbnRzID0gZWxlbWVudHNcbiAgICAgICAgdGhpcy5zY3JvbGxUb0JvdHRvbSgpXG4gICAgICAgIG5leHRFbGVtZW50U2VsZWN0aW9uID0gbm93ICsgZGVsYXlcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcyksIDUwKVxuXG4gICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2UucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5J11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yRWxlbWVudFNjcm9sbFxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgU2VsZWN0b3JHcm91cCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIF9nZXREYXRhOiBmdW5jdGlvbiAocGFyZW50RWxlbWVudCkge1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBzZWxmID0gdGhpc1xuXHRcdC8vIGNhbm5vdCByZXVzZSB0aGlzLmdldERhdGFFbGVtZW50cyBiZWNhdXNlIGl0IGRlcGVuZHMgb24gKm11bHRpcGxlKiBwcm9wZXJ0eVxuICAgIHZhciBlbGVtZW50cyA9IHNlbGYuJCh0aGlzLnNlbGVjdG9yLCBwYXJlbnRFbGVtZW50KVxuXG4gICAgdmFyIHJlY29yZHMgPSBbXVxuICAgIHNlbGYuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuXG4gICAgICBkYXRhW3RoaXMuaWRdID0gc2VsZi4kKGVsZW1lbnQpLnRleHQoKVxuXG4gICAgICBpZiAodGhpcy5leHRyYWN0QXR0cmlidXRlKSB7XG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctJyArIHRoaXMuZXh0cmFjdEF0dHJpYnV0ZV0gPSBzZWxmLiQoZWxlbWVudCkuYXR0cih0aGlzLmV4dHJhY3RBdHRyaWJ1dGUpXG4gICAgICB9XG5cbiAgICAgIHJlY29yZHMucHVzaChkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHZhciByZXN1bHQgPSB7fVxuICAgIHJlc3VsdFt0aGlzLmlkXSA9IHJlY29yZHNcblxuICAgIGRmZC5yZXNvbHZlKFtyZXN1bHRdKVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWRdXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydkZWxheScsICdleHRyYWN0QXR0cmlidXRlJ11cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yR3JvdXBcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9ySFRNTCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciByZXN1bHQgPSBbXVxuICAgIHNlbGYuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaywgZWxlbWVudCkge1xuICAgICAgdmFyIGRhdGEgPSB7fVxuICAgICAgdmFyIGh0bWwgPSBzZWxmLiQoZWxlbWVudCkuaHRtbCgpXG5cbiAgICAgIGlmICh0aGlzLnJlZ2V4ICE9PSB1bmRlZmluZWQgJiYgdGhpcy5yZWdleC5sZW5ndGgpIHtcbiAgICAgICAgdmFyIG1hdGNoZXMgPSBodG1sLm1hdGNoKG5ldyBSZWdFeHAodGhpcy5yZWdleCkpXG4gICAgICAgIGlmIChtYXRjaGVzICE9PSBudWxsKSB7XG4gICAgICAgICAgaHRtbCA9IG1hdGNoZXNbMF1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBodG1sID0gbnVsbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gaHRtbFxuXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSBudWxsXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH1cblxuICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAncmVnZXgnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JIVE1MXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciB3aGVuQ2FsbFNlcXVlbnRpYWxseSA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9qcXVlcnkud2hlbmNhbGxzZXF1ZW50aWFsbHknKVxudmFyIEJhc2U2NCA9IHJlcXVpcmUoJy4uLy4uL2Fzc2V0cy9iYXNlNjQnKVxudmFyIFNlbGVjdG9ySW1hZ2UgPSB7XG4gIGNhblJldHVybk11bHRpcGxlUmVjb3JkczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG5cbiAgY2FuSGF2ZUNoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuSGF2ZUxvY2FsQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5DcmVhdGVOZXdKb2JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgIHZhciBlbGVtZW50cyA9IHRoaXMuZ2V0RGF0YUVsZW1lbnRzKHBhcmVudEVsZW1lbnQpXG5cbiAgICB2YXIgZGVmZXJyZWREYXRhQ2FsbHMgPSBbXVxuICAgIHRoaXMuJChlbGVtZW50cykuZWFjaChmdW5jdGlvbiAoaSwgZWxlbWVudCkge1xuICAgICAgZGVmZXJyZWREYXRhQ2FsbHMucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1zcmMnXSA9IGVsZW1lbnQuc3JjXG5cblx0XHRcdFx0Ly8gZG93bmxvYWQgaW1hZ2UgaWYgcmVxdWlyZWRcbiAgICAgICAgaWYgKCF0aGlzLmRvd25sb2FkSW1hZ2UpIHtcbiAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBkZWZlcnJlZEltYWdlQmFzZTY0ID0gdGhpcy5kb3dubG9hZEltYWdlQmFzZTY0KGVsZW1lbnQuc3JjKVxuXG4gICAgICAgICAgZGVmZXJyZWRJbWFnZUJhc2U2NC5kb25lKGZ1bmN0aW9uIChpbWFnZVJlc3BvbnNlKSB7XG4gICAgICAgICAgICBkYXRhWydfaW1hZ2VCYXNlNjQtJyArIHRoaXMuaWRdID0gaW1hZ2VSZXNwb25zZS5pbWFnZUJhc2U2NFxuICAgICAgICAgICAgZGF0YVsnX2ltYWdlTWltZVR5cGUtJyArIHRoaXMuaWRdID0gaW1hZ2VSZXNwb25zZS5taW1lVHlwZVxuXG4gICAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICAgIH0uYmluZCh0aGlzKSkuZmFpbChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQvLyBmYWlsZWQgdG8gZG93bmxvYWQgaW1hZ2UgY29udGludWUuXG5cdFx0XHRcdFx0XHQvLyBAVE9ETyBoYW5kbGUgZXJycm9yXG4gICAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGVmZXJyZWREYXRhLnByb21pc2UoKVxuICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRlZmVycmVkRGF0YUNhbGxzKS5kb25lKGZ1bmN0aW9uIChkYXRhUmVzdWx0cykge1xuICAgICAgaWYgKHRoaXMubXVsdGlwbGUgPT09IGZhbHNlICYmIGVsZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctc3JjJ10gPSBudWxsXG4gICAgICAgIGRhdGFSZXN1bHRzLnB1c2goZGF0YSlcbiAgICAgIH1cblxuICAgICAgZGZkLnJlc29sdmUoZGF0YVJlc3VsdHMpXG4gICAgfSlcblxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZG93bmxvYWRGaWxlQXNCbG9iOiBmdW5jdGlvbiAodXJsKSB7XG4gICAgdmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciB4aHIgPSBuZXcgd2luZG93LlhNTEh0dHBSZXF1ZXN0KClcbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICB2YXIgYmxvYiA9IHRoaXMucmVzcG9uc2VcbiAgICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlc29sdmUoYmxvYilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWZlcnJlZFJlc3BvbnNlLnJlamVjdCh4aHIuc3RhdHVzVGV4dClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB4aHIub3BlbignR0VUJywgdXJsKVxuICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICB4aHIuc2VuZCgpXG5cbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBkb3dubG9hZEltYWdlQmFzZTY0OiBmdW5jdGlvbiAodXJsKSB7XG4gICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuICAgIHZhciBkZWZlcnJlZERvd25sb2FkID0gdGhpcy5kb3dubG9hZEZpbGVBc0Jsb2IodXJsKVxuICAgIGRlZmVycmVkRG93bmxvYWQuZG9uZShmdW5jdGlvbiAoYmxvYikge1xuICAgICAgdmFyIG1pbWVUeXBlID0gYmxvYi50eXBlXG4gICAgICB2YXIgZGVmZXJyZWRCbG9iID0gQmFzZTY0LmJsb2JUb0Jhc2U2NChibG9iKVxuICAgICAgZGVmZXJyZWRCbG9iLmRvbmUoZnVuY3Rpb24gKGltYWdlQmFzZTY0KSB7XG4gICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZSh7XG4gICAgICAgICAgbWltZVR5cGU6IG1pbWVUeXBlLFxuICAgICAgICAgIGltYWdlQmFzZTY0OiBpbWFnZUJhc2U2NFxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9KS5mYWlsKGRlZmVycmVkUmVzcG9uc2UuZmFpbClcbiAgICByZXR1cm4gZGVmZXJyZWRSZXNwb25zZS5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZCArICctc3JjJ11cbiAgfSxcblxuICBnZXRGZWF0dXJlczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbJ211bHRpcGxlJywgJ2RlbGF5JywgJ2Rvd25sb2FkSW1hZ2UnXVxuICB9LFxuXG4gIGdldEl0ZW1DU1NTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAnaW1nJ1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JJbWFnZVxuIiwidmFyIGpxdWVyeSA9IHJlcXVpcmUoJ2pxdWVyeS1kZWZlcnJlZCcpXG52YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcblxudmFyIFNlbGVjdG9yTGluayA9IHtcbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZWxlbWVudHMgPSB0aGlzLmdldERhdGFFbGVtZW50cyhwYXJlbnRFbGVtZW50KVxuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgdmFyIGRmZCA9IGpxdWVyeS5EZWZlcnJlZCgpXG5cblx0XHQvLyByZXR1cm4gZW1wdHkgcmVjb3JkIGlmIG5vdCBtdWx0aXBsZSB0eXBlIGFuZCBubyBlbGVtZW50cyBmb3VuZFxuICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSBudWxsXG4gICAgICBkZmQucmVzb2x2ZShbZGF0YV0pXG4gICAgICByZXR1cm4gZGZkXG4gICAgfVxuXG5cdFx0Ly8gZXh0cmFjdCBsaW5rcyBvbmUgYnkgb25lXG4gICAgdmFyIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscyA9IFtdXG4gICAgc2VsZi4kKGVsZW1lbnRzKS5lYWNoKGZ1bmN0aW9uIChrLCBlbGVtZW50KSB7XG4gICAgICBkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMucHVzaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgZGVmZXJyZWREYXRhID0ganF1ZXJ5LkRlZmVycmVkKClcblxuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIGRhdGFbdGhpcy5pZF0gPSBzZWxmLiQoZWxlbWVudCkudGV4dCgpXG4gICAgICAgIGRhdGEuX2ZvbGxvd1NlbGVjdG9ySWQgPSB0aGlzLmlkXG4gICAgICAgIGRhdGFbdGhpcy5pZCArICctaHJlZiddID0gZWxlbWVudC5ocmVmXG4gICAgICAgIGRhdGEuX2ZvbGxvdyA9IGVsZW1lbnQuaHJlZlxuICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuXG4gICAgICAgIHJldHVybiBkZWZlcnJlZERhdGFcbiAgICAgIH0uYmluZCh0aGlzLCBlbGVtZW50KSlcbiAgICB9LmJpbmQodGhpcykpXG5cbiAgICB3aGVuQ2FsbFNlcXVlbnRpYWxseShkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMpLmRvbmUoZnVuY3Rpb24gKHJlc3BvbnNlcykge1xuICAgICAgdmFyIHJlc3VsdCA9IFtdXG4gICAgICByZXNwb25zZXMuZm9yRWFjaChmdW5jdGlvbiAoZGF0YVJlc3VsdCkge1xuICAgICAgICByZXN1bHQucHVzaChkYXRhUmVzdWx0KVxuICAgICAgfSlcbiAgICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICB9KVxuXG4gICAgcmV0dXJuIGRmZC5wcm9taXNlKClcbiAgfSxcblxuICBnZXREYXRhQ29sdW1uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbdGhpcy5pZCwgdGhpcy5pZCArICctaHJlZiddXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdkZWxheSddXG4gIH0sXG5cbiAgZ2V0SXRlbUNTU1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICdhJ1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JMaW5rXG4iLCJ2YXIgd2hlbkNhbGxTZXF1ZW50aWFsbHkgPSByZXF1aXJlKCcuLi8uLi9hc3NldHMvanF1ZXJ5LndoZW5jYWxsc2VxdWVudGlhbGx5JylcbnZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIENzc1NlbGVjdG9yID0gcmVxdWlyZSgnY3NzLXNlbGVjdG9yJykuQ3NzU2VsZWN0b3JcbnZhciBTZWxlY3RvclBvcHVwTGluayA9IHtcbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlXG4gIH0sXG4gIHdpbGxSZXR1cm5FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxudmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxudmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG5cdFx0Ly8gcmV0dXJuIGVtcHR5IHJlY29yZCBpZiBub3QgbXVsdGlwbGUgdHlwZSBhbmQgbm8gZWxlbWVudHMgZm91bmRcbiAgICBpZiAodGhpcy5tdWx0aXBsZSA9PT0gZmFsc2UgJiYgZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gbnVsbFxuICAgICAgZGZkLnJlc29sdmUoW2RhdGFdKVxuICAgICAgcmV0dXJuIGRmZFxuICAgIH1cblxuXHRcdC8vIGV4dHJhY3QgbGlua3Mgb25lIGJ5IG9uZVxuICAgIHZhciBkZWZlcnJlZERhdGFFeHRyYWN0aW9uQ2FsbHMgPSBbXVxuICAgICQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscy5wdXNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBkZWZlcnJlZERhdGEgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgIHZhciBkYXRhID0ge31cbiAgICAgICAgZGF0YVt0aGlzLmlkXSA9ICQoZWxlbWVudCkudGV4dCgpXG4gICAgICAgIGRhdGEuX2ZvbGxvd1NlbGVjdG9ySWQgPSB0aGlzLmlkXG5cbiAgICAgICAgdmFyIGRlZmVycmVkUG9wdXBVUkwgPSB0aGlzLmdldFBvcHVwVVJMKGVsZW1lbnQpXG4gICAgICAgIGRlZmVycmVkUG9wdXBVUkwuZG9uZShmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgICAgZGF0YVt0aGlzLmlkICsgJy1ocmVmJ10gPSB1cmxcbiAgICAgICAgICBkYXRhLl9mb2xsb3cgPSB1cmxcbiAgICAgICAgICBkZWZlcnJlZERhdGEucmVzb2x2ZShkYXRhKVxuICAgICAgICB9LmJpbmQodGhpcykpXG5cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkRGF0YVxuICAgICAgfS5iaW5kKHRoaXMsIGVsZW1lbnQpKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIHdoZW5DYWxsU2VxdWVudGlhbGx5KGRlZmVycmVkRGF0YUV4dHJhY3Rpb25DYWxscykuZG9uZShmdW5jdGlvbiAocmVzcG9uc2VzKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gW11cbiAgICAgIHJlc3BvbnNlcy5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhUmVzdWx0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGRhdGFSZXN1bHQpXG4gICAgICB9KVxuICAgICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIH0pXG5cbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGFuIHVybCBmcm9tIGEgd2luZG93Lm9wZW4gY2FsbCBieSBtb2NraW5nIHRoZSB3aW5kb3cub3BlbiBmdW5jdGlvblxuXHQgKiBAcGFyYW0gZWxlbWVudFxuXHQgKiBAcmV0dXJucyAkLkRlZmVycmVkKClcblx0ICovXG4gIGdldFBvcHVwVVJMOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgIHZhciAkID0gdGhpcy4kXG4gICAgdmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxuICAgIHZhciB3aW5kb3cgPSB0aGlzLndpbmRvd1xuICAgIC8vIG92ZXJyaWRlIHdpbmRvdy5vcGVuIGZ1bmN0aW9uLiB3ZSBuZWVkIHRvIGV4ZWN1dGUgdGhpcyBpbiBwYWdlIHNjb3BlLlxuXHRcdC8vIHdlIG5lZWQgdG8ga25vdyBob3cgdG8gZmluZCB0aGlzIGVsZW1lbnQgZnJvbSBwYWdlIHNjb3BlLlxuICAgIHZhciBjcyA9IG5ldyBDc3NTZWxlY3Rvcih7XG4gICAgICBlbmFibGVTbWFydFRhYmxlU2VsZWN0b3I6IGZhbHNlLFxuICAgICAgcGFyZW50OiBkb2N1bWVudC5ib2R5LFxuICAgICAgZW5hYmxlUmVzdWx0U3RyaXBwaW5nOiBmYWxzZVxuICAgIH0pXG4gICAgdmFyIGNzc1NlbGVjdG9yID0gY3MuZ2V0Q3NzU2VsZWN0b3IoW2VsZW1lbnRdKVxuICAgIGNvbnNvbGUubG9nKGNzc1NlbGVjdG9yKVxuICAgIGNvbnNvbGUubG9nKGRvY3VtZW50LmJvZHkucXVlcnlTZWxlY3RvckFsbChjc3NTZWxlY3RvcikpXG5cdFx0Ly8gdGhpcyBmdW5jdGlvbiB3aWxsIGNhdGNoIHdpbmRvdy5vcGVuIGNhbGwgYW5kIHBsYWNlIHRoZSByZXF1ZXN0ZWQgdXJsIGFzIHRoZSBlbGVtZW50cyBkYXRhIGF0dHJpYnV0ZVxuICAgIHZhciBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKVxuICAgIHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCdcbiAgICBjb25zb2xlLmxvZyhjc3NTZWxlY3RvcilcbiAgICBjb25zb2xlLmxvZyhkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGNzc1NlbGVjdG9yKSlcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGNzc1NlbGVjdG9yKVswXVxuXG4gICAgY29uc3Qgb3BlbiA9IHdpbmRvdy5vcGVuXG4gICAgd2luZG93Lm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgdXJsID0gYXJndW1lbnRzWzBdXG4gICAgICBlbC5kYXRhc2V0LndlYlNjcmFwZXJFeHRyYWN0VXJsID0gdXJsXG4gICAgICB3aW5kb3cub3BlbiA9IG9wZW5cbiAgICB9XG4gICAgZWwuY2xpY2soKVxuXG5cdFx0Ly8gd2FpdCBmb3IgdXJsIHRvIGJlIGF2YWlsYWJsZVxuICAgIHZhciBkZWZlcnJlZFVSTCA9IGpxdWVyeS5EZWZlcnJlZCgpXG4gICAgdmFyIHRpbWVvdXQgPSBNYXRoLmFicyg1MDAwIC8gMzApIC8vIDVzIHRpbWVvdXQgdG8gZ2VuZXJhdGUgYW4gdXJsIGZvciBwb3B1cFxuICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciB1cmwgPSAkKGVsZW1lbnQpLmRhdGEoJ3dlYi1zY3JhcGVyLWV4dHJhY3QtdXJsJylcbiAgICAgIGlmICh1cmwpIHtcbiAgICAgICAgZGVmZXJyZWRVUkwucmVzb2x2ZSh1cmwpXG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpXG4gICAgICAgIHNjcmlwdC5yZW1vdmUoKVxuICAgICAgfVxuXHRcdFx0Ly8gdGltZW91dCBwb3B1cCBvcGVuaW5nXG4gICAgICBpZiAodGltZW91dC0tIDw9IDApIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbClcbiAgICAgICAgc2NyaXB0LnJlbW92ZSgpXG4gICAgICB9XG4gICAgfSwgMzApXG5cbiAgICByZXR1cm4gZGVmZXJyZWRVUkwucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMuaWQsIHRoaXMuaWQgKyAnLWhyZWYnXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAnZGVsYXknXVxuICB9LFxuXG4gIGdldEl0ZW1DU1NTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAnKidcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yUG9wdXBMaW5rXG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcblxudmFyIFNlbGVjdG9yVGFibGUgPSB7XG5cbiAgY2FuUmV0dXJuTXVsdGlwbGVSZWNvcmRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfSxcblxuICBjYW5IYXZlQ2hpbGRTZWxlY3RvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICBjYW5IYXZlTG9jYWxDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkNyZWF0ZU5ld0pvYnM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgd2lsbFJldHVybkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG4gIGdldFRhYmxlSGVhZGVyQ29sdW1uczogZnVuY3Rpb24gKCR0YWJsZSkge1xuICAgIHZhciBjb2x1bW5zID0ge31cbiAgICB2YXIgJCA9IHRoaXMuJFxudmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxudmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gICAgdmFyIGhlYWRlclJvd1NlbGVjdG9yID0gdGhpcy5nZXRUYWJsZUhlYWRlclJvd1NlbGVjdG9yKClcbiAgICB2YXIgJGhlYWRlclJvdyA9ICQoJHRhYmxlKS5maW5kKGhlYWRlclJvd1NlbGVjdG9yKVxuICAgIGlmICgkaGVhZGVyUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICRoZWFkZXJSb3cuZmluZCgndGQsdGgnKS5lYWNoKGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIHZhciBoZWFkZXIgPSAkKHRoaXMpLnRleHQoKS50cmltKClcbiAgICAgICAgY29sdW1uc1toZWFkZXJdID0ge1xuICAgICAgICAgIGluZGV4OiBpICsgMVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICByZXR1cm4gY29sdW1uc1xuICB9LFxuICBfZ2V0RGF0YTogZnVuY3Rpb24gKHBhcmVudEVsZW1lbnQpIHtcbiAgICB2YXIgZGZkID0ganF1ZXJ5LkRlZmVycmVkKClcbiAgICB2YXIgJCA9IHRoaXMuJFxudmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxudmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG5cbiAgICB2YXIgdGFibGVzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciByZXN1bHQgPSBbXVxuICAgICQodGFibGVzKS5lYWNoKGZ1bmN0aW9uIChrLCB0YWJsZSkge1xuICAgICAgdmFyIGNvbHVtbnMgPSB0aGlzLmdldFRhYmxlSGVhZGVyQ29sdW1ucygkKHRhYmxlKSlcblxuICAgICAgdmFyIGRhdGFSb3dTZWxlY3RvciA9IHRoaXMuZ2V0VGFibGVEYXRhUm93U2VsZWN0b3IoKVxuICAgICAgJCh0YWJsZSkuZmluZChkYXRhUm93U2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKGksIHJvdykge1xuICAgICAgICB2YXIgZGF0YSA9IHt9XG4gICAgICAgIHRoaXMuY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgICAgICBpZiAoY29sdW1uLmV4dHJhY3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGlmIChjb2x1bW5zW2NvbHVtbi5oZWFkZXJdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgZGF0YVtjb2x1bW4ubmFtZV0gPSBudWxsXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgcm93VGV4dCA9ICQocm93KS5maW5kKCc+Om50aC1jaGlsZCgnICsgY29sdW1uc1tjb2x1bW4uaGVhZGVyXS5pbmRleCArICcpJykudGV4dCgpLnRyaW0oKVxuICAgICAgICAgICAgICBkYXRhW2NvbHVtbi5uYW1lXSA9IHJvd1RleHRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIHJlc3VsdC5wdXNoKGRhdGEpXG4gICAgICB9LmJpbmQodGhpcykpXG4gICAgfS5iaW5kKHRoaXMpKVxuXG4gICAgZGZkLnJlc29sdmUocmVzdWx0KVxuICAgIHJldHVybiBkZmQucHJvbWlzZSgpXG4gIH0sXG5cbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZGF0YUNvbHVtbnMgPSBbXVxuICAgIHRoaXMuY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgIGlmIChjb2x1bW4uZXh0cmFjdCA9PT0gdHJ1ZSkge1xuICAgICAgICBkYXRhQ29sdW1ucy5wdXNoKGNvbHVtbi5uYW1lKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGRhdGFDb2x1bW5zXG4gIH0sXG5cbiAgZ2V0RmVhdHVyZXM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gWydtdWx0aXBsZScsICdjb2x1bW5zJywgJ2RlbGF5JywgJ3RhYmxlRGF0YVJvd1NlbGVjdG9yJywgJ3RhYmxlSGVhZGVyUm93U2VsZWN0b3InXVxuICB9LFxuXG4gIGdldEl0ZW1DU1NTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAndGFibGUnXG4gIH0sXG5cbiAgZ2V0VGFibGVIZWFkZXJSb3dTZWxlY3RvckZyb21UYWJsZUhUTUw6IGZ1bmN0aW9uIChodG1sLCBvcHRpb25zID0ge30pIHtcbiAgICB2YXIgJCA9IG9wdGlvbnMuJCB8fCB0aGlzLiRcbiAgICB2YXIgJHRhYmxlID0gJChodG1sKVxuICAgIGlmICgkdGFibGUuZmluZCgndGhlYWQgdHI6aGFzKHRkOm5vdCg6ZW1wdHkpKSwgdGhlYWQgdHI6aGFzKHRoOm5vdCg6ZW1wdHkpKScpLmxlbmd0aCkge1xuICAgICAgaWYgKCR0YWJsZS5maW5kKCd0aGVhZCB0cicpLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gJ3RoZWFkIHRyJ1xuICAgICAgfVx0XHRcdGVsc2Uge1xuICAgICAgICB2YXIgJHJvd3MgPSAkdGFibGUuZmluZCgndGhlYWQgdHInKVxuXHRcdFx0XHQvLyBmaXJzdCByb3cgd2l0aCBkYXRhXG4gICAgICAgIHZhciByb3dJbmRleCA9ICRyb3dzLmluZGV4KCRyb3dzLmZpbHRlcignOmhhcyh0ZDpub3QoOmVtcHR5KSksOmhhcyh0aDpub3QoOmVtcHR5KSknKVswXSlcbiAgICAgICAgcmV0dXJuICd0aGVhZCB0cjpudGgtb2YtdHlwZSgnICsgKHJvd0luZGV4ICsgMSkgKyAnKSdcbiAgICAgIH1cbiAgICB9XHRcdGVsc2UgaWYgKCR0YWJsZS5maW5kKCd0ciB0ZDpub3QoOmVtcHR5KSwgdHIgdGg6bm90KDplbXB0eSknKS5sZW5ndGgpIHtcbiAgICAgIHZhciAkcm93cyA9ICR0YWJsZS5maW5kKCd0cicpXG5cdFx0XHQvLyBmaXJzdCByb3cgd2l0aCBkYXRhXG4gICAgICB2YXIgcm93SW5kZXggPSAkcm93cy5pbmRleCgkcm93cy5maWx0ZXIoJzpoYXModGQ6bm90KDplbXB0eSkpLDpoYXModGg6bm90KDplbXB0eSkpJylbMF0pXG4gICAgICByZXR1cm4gJ3RyOm50aC1vZi10eXBlKCcgKyAocm93SW5kZXggKyAxKSArICcpJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICByZXR1cm4gJydcbiAgICB9XG4gIH0sXG5cbiAgZ2V0VGFibGVEYXRhUm93U2VsZWN0b3JGcm9tVGFibGVIVE1MOiBmdW5jdGlvbiAoaHRtbCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdmFyICQgPSBvcHRpb25zLiQgfHwgdGhpcy4kXG4gICAgdmFyICR0YWJsZSA9ICQoaHRtbClcbiAgICBpZiAoJHRhYmxlLmZpbmQoJ3RoZWFkIHRyOmhhcyh0ZDpub3QoOmVtcHR5KSksIHRoZWFkIHRyOmhhcyh0aDpub3QoOmVtcHR5KSknKS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiAndGJvZHkgdHInXG4gICAgfVx0XHRlbHNlIGlmICgkdGFibGUuZmluZCgndHIgdGQ6bm90KDplbXB0eSksIHRyIHRoOm5vdCg6ZW1wdHkpJykubGVuZ3RoKSB7XG4gICAgICB2YXIgJHJvd3MgPSAkdGFibGUuZmluZCgndHInKVxuXHRcdFx0Ly8gZmlyc3Qgcm93IHdpdGggZGF0YVxuICAgICAgdmFyIHJvd0luZGV4ID0gJHJvd3MuaW5kZXgoJHJvd3MuZmlsdGVyKCc6aGFzKHRkOm5vdCg6ZW1wdHkpKSw6aGFzKHRoOm5vdCg6ZW1wdHkpKScpWzBdKVxuICAgICAgcmV0dXJuICd0cjpudGgtb2YtdHlwZShuKycgKyAocm93SW5kZXggKyAyKSArICcpJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICByZXR1cm4gJydcbiAgICB9XG4gIH0sXG5cbiAgZ2V0VGFibGVIZWFkZXJSb3dTZWxlY3RvcjogZnVuY3Rpb24gKCkge1xuXHRcdC8vIGhhbmRsZSBsZWdhY3kgc2VsZWN0b3JzXG4gICAgaWYgKHRoaXMudGFibGVIZWFkZXJSb3dTZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gJ3RoZWFkIHRyJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy50YWJsZUhlYWRlclJvd1NlbGVjdG9yXG4gICAgfVxuICB9LFxuXG4gIGdldFRhYmxlRGF0YVJvd1NlbGVjdG9yOiBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gaGFuZGxlIGxlZ2FjeSBzZWxlY3RvcnNcbiAgICBpZiAodGhpcy50YWJsZURhdGFSb3dTZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gJ3Rib2R5IHRyJ1xuICAgIH1cdFx0ZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy50YWJsZURhdGFSb3dTZWxlY3RvclxuICAgIH1cbiAgfSxcblxuXHQvKipcblx0ICogRXh0cmFjdCB0YWJsZSBoZWFkZXIgY29sdW1uIGluZm8gZnJvbSBodG1sXG5cdCAqIEBwYXJhbSBodG1sXG5cdCAqL1xuICBnZXRUYWJsZUhlYWRlckNvbHVtbnNGcm9tSFRNTDogZnVuY3Rpb24gKGhlYWRlclJvd1NlbGVjdG9yLCBodG1sLCBvcHRpb25zID0ge30pIHtcbiAgICB2YXIgJCA9IG9wdGlvbnMuJCB8fCB0aGlzLiRcbiAgICB2YXIgJHRhYmxlID0gJChodG1sKVxuICAgIHZhciAkaGVhZGVyUm93Q29sdW1ucyA9ICR0YWJsZS5maW5kKGhlYWRlclJvd1NlbGVjdG9yKS5maW5kKCd0ZCx0aCcpXG5cbiAgICB2YXIgY29sdW1ucyA9IFtdXG5cbiAgICAkaGVhZGVyUm93Q29sdW1ucy5lYWNoKGZ1bmN0aW9uIChpLCBjb2x1bW5FbCkge1xuICAgICAgdmFyIGhlYWRlciA9ICQoY29sdW1uRWwpLnRleHQoKS50cmltKClcbiAgICAgIHZhciBuYW1lID0gaGVhZGVyXG4gICAgICBpZiAoaGVhZGVyLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICBjb2x1bW5zLnB1c2goe1xuICAgICAgICAgIGhlYWRlcjogaGVhZGVyLFxuICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgZXh0cmFjdDogdHJ1ZVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGNvbHVtbnNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdG9yVGFibGVcbiIsInZhciBqcXVlcnkgPSByZXF1aXJlKCdqcXVlcnktZGVmZXJyZWQnKVxudmFyIFNlbGVjdG9yVGV4dCA9IHtcblxuICBjYW5SZXR1cm5NdWx0aXBsZVJlY29yZHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9LFxuXG4gIGNhbkhhdmVDaGlsZFNlbGVjdG9yczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIGNhbkhhdmVMb2NhbENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH0sXG5cbiAgY2FuQ3JlYXRlTmV3Sm9iczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZVxuICB9LFxuICB3aWxsUmV0dXJuRWxlbWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcbiAgX2dldERhdGE6IGZ1bmN0aW9uIChwYXJlbnRFbGVtZW50KSB7XG4gICAgdmFyICQgPSB0aGlzLiRcbnZhciBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnRcbnZhciB3aW5kb3cgPSB0aGlzLndpbmRvd1xuICAgIHZhciBkZmQgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgdmFyIGVsZW1lbnRzID0gdGhpcy5nZXREYXRhRWxlbWVudHMocGFyZW50RWxlbWVudClcblxuICAgIHZhciByZXN1bHQgPSBbXVxuICAgICQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGssIGVsZW1lbnQpIHtcbiAgICAgIHZhciBkYXRhID0ge31cblxuXHRcdFx0Ly8gcmVtb3ZlIHNjcmlwdCwgc3R5bGUgdGFnIGNvbnRlbnRzIGZyb20gdGV4dCByZXN1bHRzXG4gICAgICB2YXIgJGVsZW1lbnRfY2xvbmUgPSAkKGVsZW1lbnQpLmNsb25lKClcbiAgICAgICRlbGVtZW50X2Nsb25lLmZpbmQoJ3NjcmlwdCwgc3R5bGUnKS5yZW1vdmUoKVxuXHRcdFx0Ly8gPGJyPiByZXBsYWNlIGJyIHRhZ3Mgd2l0aCBuZXdsaW5lc1xuICAgICAgJGVsZW1lbnRfY2xvbmUuZmluZCgnYnInKS5hZnRlcignXFxuJylcblxuICAgICAgdmFyIHRleHQgPSAkZWxlbWVudF9jbG9uZS50ZXh0KClcbiAgICAgIGlmICh0aGlzLnJlZ2V4ICE9PSB1bmRlZmluZWQgJiYgdGhpcy5yZWdleC5sZW5ndGgpIHtcbiAgICAgICAgdmFyIG1hdGNoZXMgPSB0ZXh0Lm1hdGNoKG5ldyBSZWdFeHAodGhpcy5yZWdleCkpXG4gICAgICAgIGlmIChtYXRjaGVzICE9PSBudWxsKSB7XG4gICAgICAgICAgdGV4dCA9IG1hdGNoZXNbMF1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0ZXh0ID0gbnVsbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkYXRhW3RoaXMuaWRdID0gdGV4dFxuXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGlmICh0aGlzLm11bHRpcGxlID09PSBmYWxzZSAmJiBlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBkYXRhID0ge31cbiAgICAgIGRhdGFbdGhpcy5pZF0gPSBudWxsXG4gICAgICByZXN1bHQucHVzaChkYXRhKVxuICAgIH1cblxuICAgIGRmZC5yZXNvbHZlKHJlc3VsdClcbiAgICByZXR1cm4gZGZkLnByb21pc2UoKVxuICB9LFxuXG4gIGdldERhdGFDb2x1bW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLmlkXVxuICB9LFxuXG4gIGdldEZlYXR1cmVzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFsnbXVsdGlwbGUnLCAncmVnZXgnLCAnZGVsYXknXVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0b3JUZXh0XG4iLCJ2YXIgU2VsZWN0b3IgPSByZXF1aXJlKCcuL1NlbGVjdG9yJylcblxudmFyIFNlbGVjdG9yTGlzdCA9IGZ1bmN0aW9uIChzZWxlY3RvcnMsIG9wdGlvbnMpIHtcbiAgdmFyICQgPSBvcHRpb25zLiRcbiAgdmFyIGRvY3VtZW50ID0gb3B0aW9ucy5kb2N1bWVudFxuICB2YXIgd2luZG93ID0gb3B0aW9ucy53aW5kb3dcbiAgLy8gV2UgZG9uJ3Qgd2FudCBlbnVtZXJhYmxlIHByb3BlcnRpZXNcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICckJywge1xuICAgIHZhbHVlOiAkLFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnd2luZG93Jywge1xuICAgIHZhbHVlOiB3aW5kb3csXG4gICAgZW51bWVyYWJsZTogZmFsc2VcbiAgfSlcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdkb2N1bWVudCcsIHtcbiAgICB2YWx1ZTogZG9jdW1lbnQsXG4gICAgZW51bWVyYWJsZTogZmFsc2VcbiAgfSlcbiAgaWYgKCF0aGlzLiQpIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBqcXVlcnknKVxuaWYgKCF0aGlzLmRvY3VtZW50KSB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGRvY3VtZW50XCIpXG5pZighdGhpcy53aW5kb3cpdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB3aW5kb3dcIilcblxuICBpZiAoc2VsZWN0b3JzID09PSBudWxsIHx8IHNlbGVjdG9ycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMucHVzaChzZWxlY3RvcnNbaV0pXG4gIH1cbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZSA9IFtdXG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICBpZiAoIXRoaXMuaGFzU2VsZWN0b3Ioc2VsZWN0b3IuaWQpKSB7XG4gICAgaWYgKCEoc2VsZWN0b3IgaW5zdGFuY2VvZiBTZWxlY3RvcikpIHtcbnZhciAkID0gdGhpcy4kXG52YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG52YXIgd2luZG93ID0gdGhpcy53aW5kb3dcbiAgICAgIHNlbGVjdG9yID0gbmV3IFNlbGVjdG9yKHNlbGVjdG9yLCB7JCwgd2luZG93LCBkb2N1bWVudH0pXG4gICAgfVxuICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmNhbGwodGhpcywgc2VsZWN0b3IpXG4gIH1cbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5oYXNTZWxlY3RvciA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gIGlmIChzZWxlY3RvcklkIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgc2VsZWN0b3JJZCA9IHNlbGVjdG9ySWQuaWRcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0aGlzW2ldLmlkID09PSBzZWxlY3RvcklkKSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFsbCBzZWxlY3RvcnMgb3IgcmVjdXJzaXZlbHkgZmluZCBhbmQgcmV0dXJuIGFsbCBjaGlsZCBzZWxlY3RvcnMgb2YgYSBwYXJlbnQgc2VsZWN0b3IuXG4gKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZFxuICogQHJldHVybnMge0FycmF5fVxuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldEFsbFNlbGVjdG9ycyA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gIGlmIChwYXJlbnRTZWxlY3RvcklkID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgdmFyIGdldEFsbENoaWxkU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQsIHJlc3VsdFNlbGVjdG9ycykge1xuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGlmIChzZWxlY3Rvci5oYXNQYXJlbnRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKSkge1xuICAgICAgICBpZiAocmVzdWx0U2VsZWN0b3JzLmluZGV4T2Yoc2VsZWN0b3IpID09PSAtMSkge1xuICAgICAgICAgIHJlc3VsdFNlbGVjdG9ycy5wdXNoKHNlbGVjdG9yKVxuICAgICAgICAgIGdldEFsbENoaWxkU2VsZWN0b3JzKHNlbGVjdG9yLmlkLCByZXN1bHRTZWxlY3RvcnMpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICB9LmJpbmQodGhpcylcblxuICB2YXIgcmVzdWx0U2VsZWN0b3JzID0gW11cbiAgZ2V0QWxsQ2hpbGRTZWxlY3RvcnMocGFyZW50U2VsZWN0b3JJZCwgcmVzdWx0U2VsZWN0b3JzKVxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cbi8qKlxuICogUmV0dXJucyBvbmx5IHNlbGVjdG9ycyB0aGF0IGFyZSBkaXJlY3RseSB1bmRlciBhIHBhcmVudFxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyA9IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG52YXIgJCA9IHRoaXMuJFxudmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxudmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gIHZhciByZXN1bHRTZWxlY3RvcnMgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskLCB3aW5kb3csIGRvY3VtZW50fSlcbiAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgIGlmIChzZWxlY3Rvci5oYXNQYXJlbnRTZWxlY3RvcihwYXJlbnRTZWxlY3RvcklkKSkge1xuICAgICAgcmVzdWx0U2VsZWN0b3JzLnB1c2goc2VsZWN0b3IpXG4gICAgfVxuICB9KVxuICByZXR1cm4gcmVzdWx0U2VsZWN0b3JzXG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG52YXIgJCA9IHRoaXMuJFxudmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxudmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gIHZhciByZXN1bHRMaXN0ID0gbmV3IFNlbGVjdG9yTGlzdChudWxsLCB7JCwgd2luZG93LCBkb2N1bWVudH0pXG4gIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICByZXN1bHRMaXN0LnB1c2goc2VsZWN0b3IpXG4gIH0pXG4gIHJldHVybiByZXN1bHRMaXN0XG59XG5cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZnVsbENsb25lID0gZnVuY3Rpb24gKCkge1xudmFyICQgPSB0aGlzLiRcbnZhciBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnRcbnZhciB3aW5kb3cgPSB0aGlzLndpbmRvd1xuICB2YXIgcmVzdWx0TGlzdCA9IG5ldyBTZWxlY3Rvckxpc3QobnVsbCwgeyQsIHdpbmRvdywgZG9jdW1lbnR9KVxuICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgcmVzdWx0TGlzdC5wdXNoKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2VsZWN0b3IpKSlcbiAgfSlcbiAgcmV0dXJuIHJlc3VsdExpc3Rcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5jb25jYXQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByZXN1bHRMaXN0ID0gdGhpcy5jbG9uZSgpXG4gIGZvciAodmFyIGkgaW4gYXJndW1lbnRzKSB7XG4gICAgYXJndW1lbnRzW2ldLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICByZXN1bHRMaXN0LnB1c2goc2VsZWN0b3IpXG4gICAgfSlcbiAgfVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldFNlbGVjdG9yID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHNlbGVjdG9yID0gdGhpc1tpXVxuICAgIGlmIChzZWxlY3Rvci5pZCA9PT0gc2VsZWN0b3JJZCkge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgc2VsZWN0b3JzIGlmIHRoaXMgc2VsZWN0b3JzIGluY2x1ZGluZyBhbGwgcGFyZW50IHNlbGVjdG9ycyB3aXRoaW4gdGhpcyBwYWdlXG4gKiBAVE9ETyBub3QgdXNlZCBhbnkgbW9yZS5cbiAqIEBwYXJhbSBzZWxlY3RvcklkXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRPbmVQYWdlU2VsZWN0b3JzID0gZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbnZhciAkID0gdGhpcy4kXG52YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG52YXIgd2luZG93ID0gdGhpcy53aW5kb3dcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskLCB3aW5kb3csIGRvY3VtZW50fSlcbiAgdmFyIHNlbGVjdG9yID0gdGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKVxuICByZXN1bHRMaXN0LnB1c2godGhpcy5nZXRTZWxlY3RvcihzZWxlY3RvcklkKSlcblxuXHQvLyByZWN1cnNpdmVseSBmaW5kIGFsbCBwYXJlbnQgc2VsZWN0b3JzIHRoYXQgY291bGQgbGVhZCB0byB0aGUgcGFnZSB3aGVyZSBzZWxlY3RvcklkIGlzIHVzZWQuXG4gIHZhciBmaW5kUGFyZW50U2VsZWN0b3JzID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgc2VsZWN0b3IucGFyZW50U2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbiAgICAgIGlmIChwYXJlbnRTZWxlY3RvcklkID09PSAnX3Jvb3QnKSByZXR1cm5cbiAgICAgIHZhciBwYXJlbnRTZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3IocGFyZW50U2VsZWN0b3JJZClcbiAgICAgIGlmIChyZXN1bHRMaXN0LmluZGV4T2YocGFyZW50U2VsZWN0b3IpICE9PSAtMSkgcmV0dXJuXG4gICAgICBpZiAocGFyZW50U2VsZWN0b3Iud2lsbFJldHVybkVsZW1lbnRzKCkpIHtcbiAgICAgICAgcmVzdWx0TGlzdC5wdXNoKHBhcmVudFNlbGVjdG9yKVxuICAgICAgICBmaW5kUGFyZW50U2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfS5iaW5kKHRoaXMpXG5cbiAgZmluZFBhcmVudFNlbGVjdG9ycyhzZWxlY3RvcilcblxuXHQvLyBhZGQgYWxsIGNoaWxkIHNlbGVjdG9yc1xuICByZXN1bHRMaXN0ID0gcmVzdWx0TGlzdC5jb25jYXQodGhpcy5nZXRTaW5nbGVQYWdlQWxsQ2hpbGRTZWxlY3RvcnMoc2VsZWN0b3IuaWQpKVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG4vKipcbiAqIFJldHVybnMgYWxsIGNoaWxkIHNlbGVjdG9ycyBvZiBhIHNlbGVjdG9yIHdoaWNoIGNhbiBiZSB1c2VkIHdpdGhpbiBvbmUgcGFnZS5cbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG4gKi9cblNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0U2luZ2xlUGFnZUFsbENoaWxkU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9ySWQpIHtcbnZhciAkID0gdGhpcy4kXG52YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG52YXIgd2luZG93ID0gdGhpcy53aW5kb3dcbiAgdmFyIHJlc3VsdExpc3QgPSBuZXcgU2VsZWN0b3JMaXN0KG51bGwsIHskLCB3aW5kb3csIGRvY3VtZW50fSlcbiAgdmFyIGFkZENoaWxkU2VsZWN0b3JzID0gZnVuY3Rpb24gKHBhcmVudFNlbGVjdG9yKSB7XG4gICAgaWYgKHBhcmVudFNlbGVjdG9yLndpbGxSZXR1cm5FbGVtZW50cygpKSB7XG4gICAgICB2YXIgY2hpbGRTZWxlY3RvcnMgPSB0aGlzLmdldERpcmVjdENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yLmlkKVxuICAgICAgY2hpbGRTZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoY2hpbGRTZWxlY3Rvcikge1xuICAgICAgICBpZiAocmVzdWx0TGlzdC5pbmRleE9mKGNoaWxkU2VsZWN0b3IpID09PSAtMSkge1xuICAgICAgICAgIHJlc3VsdExpc3QucHVzaChjaGlsZFNlbGVjdG9yKVxuICAgICAgICAgIGFkZENoaWxkU2VsZWN0b3JzKGNoaWxkU2VsZWN0b3IpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9LmJpbmQodGhpcylcblxuICB2YXIgcGFyZW50U2VsZWN0b3IgPSB0aGlzLmdldFNlbGVjdG9yKHBhcmVudFNlbGVjdG9ySWQpXG4gIGFkZENoaWxkU2VsZWN0b3JzKHBhcmVudFNlbGVjdG9yKVxuICByZXR1cm4gcmVzdWx0TGlzdFxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLndpbGxSZXR1cm5NdWx0aXBsZVJlY29yZHMgPSBmdW5jdGlvbiAoc2VsZWN0b3JJZCkge1xuXHQvLyBoYW5kbGUgcmV1cWVzdGVkIHNlbGVjdG9yXG4gIHZhciBzZWxlY3RvciA9IHRoaXMuZ2V0U2VsZWN0b3Ioc2VsZWN0b3JJZClcbiAgaWYgKHNlbGVjdG9yLndpbGxSZXR1cm5NdWx0aXBsZVJlY29yZHMoKSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cblxuXHQvLyBoYW5kbGUgYWxsIGl0cyBjaGlsZCBzZWxlY3RvcnNcbiAgdmFyIGNoaWxkU2VsZWN0b3JzID0gdGhpcy5nZXRBbGxTZWxlY3RvcnMoc2VsZWN0b3JJZClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZFNlbGVjdG9ycy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzZWxlY3RvciA9IGNoaWxkU2VsZWN0b3JzW2ldXG4gICAgaWYgKHNlbGVjdG9yLndpbGxSZXR1cm5NdWx0aXBsZVJlY29yZHMoKSA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBXaGVuIHNlcmlhbGl6aW5nIHRvIEpTT04gY29udmVydCB0byBhbiBhcnJheVxuICogQHJldHVybnMge0FycmF5fVxuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHJlc3VsdCA9IFtdXG4gIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICByZXN1bHQucHVzaChzZWxlY3RvcilcbiAgfSlcbiAgcmV0dXJuIHJlc3VsdFxufVxuXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldFNlbGVjdG9yQnlJZCA9IGZ1bmN0aW9uIChzZWxlY3RvcklkKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzZWxlY3RvciA9IHRoaXNbaV1cbiAgICBpZiAoc2VsZWN0b3IuaWQgPT09IHNlbGVjdG9ySWQpIHtcbiAgICAgIHJldHVybiBzZWxlY3RvclxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIHJldHVybnMgY3NzIHNlbGVjdG9yIGZvciBhIGdpdmVuIGVsZW1lbnQuIGNzcyBzZWxlY3RvciBpbmNsdWRlcyBhbGwgcGFyZW50IGVsZW1lbnQgc2VsZWN0b3JzXG4gKiBAcGFyYW0gc2VsZWN0b3JJZFxuICogQHBhcmFtIHBhcmVudFNlbGVjdG9ySWRzIGFycmF5IG9mIHBhcmVudCBzZWxlY3RvciBpZHMgZnJvbSBkZXZ0b29scyBCcmVhZGN1bWJcbiAqIEByZXR1cm5zIHN0cmluZ1xuICovXG5TZWxlY3Rvckxpc3QucHJvdG90eXBlLmdldENTU1NlbGVjdG9yV2l0aGluT25lUGFnZSA9IGZ1bmN0aW9uIChzZWxlY3RvcklkLCBwYXJlbnRTZWxlY3Rvcklkcykge1xuICB2YXIgQ1NTU2VsZWN0b3IgPSB0aGlzLmdldFNlbGVjdG9yKHNlbGVjdG9ySWQpLnNlbGVjdG9yXG4gIHZhciBwYXJlbnRDU1NTZWxlY3RvciA9IHRoaXMuZ2V0UGFyZW50Q1NTU2VsZWN0b3JXaXRoaW5PbmVQYWdlKHBhcmVudFNlbGVjdG9ySWRzKVxuICBDU1NTZWxlY3RvciA9IHBhcmVudENTU1NlbGVjdG9yICsgQ1NTU2VsZWN0b3JcblxuICByZXR1cm4gQ1NTU2VsZWN0b3Jcbn1cblxuLyoqXG4gKiByZXR1cm5zIGNzcyBzZWxlY3RvciBmb3IgcGFyZW50IHNlbGVjdG9ycyB0aGF0IGFyZSB3aXRoaW4gb25lIHBhZ2VcbiAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkcyBhcnJheSBvZiBwYXJlbnQgc2VsZWN0b3IgaWRzIGZyb20gZGV2dG9vbHMgQnJlYWRjdW1iXG4gKiBAcmV0dXJucyBzdHJpbmdcbiAqL1xuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5nZXRQYXJlbnRDU1NTZWxlY3RvcldpdGhpbk9uZVBhZ2UgPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZHMpIHtcbiAgdmFyIENTU1NlbGVjdG9yID0gJydcblxuICBmb3IgKHZhciBpID0gcGFyZW50U2VsZWN0b3JJZHMubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuICAgIHZhciBwYXJlbnRTZWxlY3RvcklkID0gcGFyZW50U2VsZWN0b3JJZHNbaV1cbiAgICB2YXIgcGFyZW50U2VsZWN0b3IgPSB0aGlzLmdldFNlbGVjdG9yKHBhcmVudFNlbGVjdG9ySWQpXG4gICAgaWYgKHBhcmVudFNlbGVjdG9yLndpbGxSZXR1cm5FbGVtZW50cygpKSB7XG4gICAgICBDU1NTZWxlY3RvciA9IHBhcmVudFNlbGVjdG9yLnNlbGVjdG9yICsgJyAnICsgQ1NTU2VsZWN0b3JcbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gQ1NTU2VsZWN0b3Jcbn1cblxuU2VsZWN0b3JMaXN0LnByb3RvdHlwZS5oYXNSZWN1cnNpdmVFbGVtZW50U2VsZWN0b3JzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgUmVjdXJzaW9uRm91bmQgPSBmYWxzZVxuXG4gIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAodG9wU2VsZWN0b3IpIHtcbiAgICB2YXIgdmlzaXRlZFNlbGVjdG9ycyA9IFtdXG5cbiAgICB2YXIgY2hlY2tSZWN1cnNpb24gPSBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3IpIHtcblx0XHRcdC8vIGFscmVhZHkgdmlzaXRlZFxuICAgICAgaWYgKHZpc2l0ZWRTZWxlY3RvcnMuaW5kZXhPZihwYXJlbnRTZWxlY3RvcikgIT09IC0xKSB7XG4gICAgICAgIFJlY3Vyc2lvbkZvdW5kID0gdHJ1ZVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmVudFNlbGVjdG9yLndpbGxSZXR1cm5FbGVtZW50cygpKSB7XG4gICAgICAgIHZpc2l0ZWRTZWxlY3RvcnMucHVzaChwYXJlbnRTZWxlY3RvcilcbiAgICAgICAgdmFyIGNoaWxkU2VsZWN0b3JzID0gdGhpcy5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3Rvci5pZClcbiAgICAgICAgY2hpbGRTZWxlY3RvcnMuZm9yRWFjaChjaGVja1JlY3Vyc2lvbilcbiAgICAgICAgdmlzaXRlZFNlbGVjdG9ycy5wb3AoKVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKVxuXG4gICAgY2hlY2tSZWN1cnNpb24odG9wU2VsZWN0b3IpXG4gIH0uYmluZCh0aGlzKSlcblxuICByZXR1cm4gUmVjdXJzaW9uRm91bmRcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3Rvckxpc3RcbiIsInZhciBTZWxlY3RvckVsZW1lbnQgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yRWxlbWVudCcpXG52YXIgU2VsZWN0b3JFbGVtZW50QXR0cmlidXRlID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRBdHRyaWJ1dGUnKVxudmFyIFNlbGVjdG9yRWxlbWVudENsaWNrID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRDbGljaycpXG52YXIgU2VsZWN0b3JFbGVtZW50U2Nyb2xsID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckVsZW1lbnRTY3JvbGwnKVxudmFyIFNlbGVjdG9yR3JvdXAgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yR3JvdXAnKVxudmFyIFNlbGVjdG9ySFRNTCA9IHJlcXVpcmUoJy4vU2VsZWN0b3IvU2VsZWN0b3JIVE1MJylcbnZhciBTZWxlY3RvckltYWdlID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvckltYWdlJylcbnZhciBTZWxlY3RvckxpbmsgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yTGluaycpXG52YXIgU2VsZWN0b3JQb3B1cExpbmsgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yUG9wdXBMaW5rJylcbnZhciBTZWxlY3RvclRhYmxlID0gcmVxdWlyZSgnLi9TZWxlY3Rvci9TZWxlY3RvclRhYmxlJylcbnZhciBTZWxlY3RvclRleHQgPSByZXF1aXJlKCcuL1NlbGVjdG9yL1NlbGVjdG9yVGV4dCcpXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBTZWxlY3RvckVsZW1lbnQsXG4gIFNlbGVjdG9yRWxlbWVudEF0dHJpYnV0ZSxcbiAgU2VsZWN0b3JFbGVtZW50Q2xpY2ssXG4gIFNlbGVjdG9yRWxlbWVudFNjcm9sbCxcbiAgU2VsZWN0b3JHcm91cCxcbiAgU2VsZWN0b3JIVE1MLFxuICBTZWxlY3RvckltYWdlLFxuICBTZWxlY3RvckxpbmssXG4gIFNlbGVjdG9yUG9wdXBMaW5rLFxuICBTZWxlY3RvclRhYmxlLFxuICBTZWxlY3RvclRleHRcbn1cbiIsInZhciBTZWxlY3RvciA9IHJlcXVpcmUoJy4vU2VsZWN0b3InKVxudmFyIFNlbGVjdG9yTGlzdCA9IHJlcXVpcmUoJy4vU2VsZWN0b3JMaXN0JylcbnZhciBTaXRlbWFwID0gZnVuY3Rpb24gKHNpdGVtYXBPYmosIG9wdGlvbnMpIHtcbiAgdmFyICQgPSBvcHRpb25zLiRcbiAgdmFyIGRvY3VtZW50ID0gb3B0aW9ucy5kb2N1bWVudFxuICB2YXIgd2luZG93ID0gb3B0aW9ucy53aW5kb3dcbiAgLy8gV2UgZG9uJ3Qgd2FudCBlbnVtZXJhYmxlIHByb3BlcnRpZXNcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICckJywge1xuICAgIHZhbHVlOiAkLFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnd2luZG93Jywge1xuICAgIHZhbHVlOiB3aW5kb3csXG4gICAgZW51bWVyYWJsZTogZmFsc2VcbiAgfSlcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdkb2N1bWVudCcsIHtcbiAgICB2YWx1ZTogZG9jdW1lbnQsXG4gICAgZW51bWVyYWJsZTogZmFsc2VcbiAgfSlcbiAgaWYgKCF0aGlzLiQpIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBqcXVlcnknKVxuaWYgKCF0aGlzLmRvY3VtZW50KSB7XG4gIGNvbnNvbGUuZXJyb3IoKG5ldyBFcnJvcigpKS5zdGFjaylcblxuICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGRvY3VtZW50XCIpXG59XG5pZighdGhpcy53aW5kb3cpdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB3aW5kb3dcIilcbiAgdGhpcy5pbml0RGF0YShzaXRlbWFwT2JqKVxufVxuXG5TaXRlbWFwLnByb3RvdHlwZSA9IHtcblxuICBpbml0RGF0YTogZnVuY3Rpb24gKHNpdGVtYXBPYmopIHtcbiAgICBjb25zb2xlLmxvZyh0aGlzKVxuICAgIGZvciAodmFyIGtleSBpbiBzaXRlbWFwT2JqKSB7XG4gICAgICBjb25zb2xlLmxvZyhrZXkpXG4gICAgICB0aGlzW2tleV0gPSBzaXRlbWFwT2JqW2tleV1cbiAgICB9XG4gICAgY29uc29sZS5sb2codGhpcylcbiAgICB2YXIgJCA9IHRoaXMuJFxuICAgIHZhciB3aW5kb3cgPSB0aGlzLndpbmRvd1xuICAgIHZhciBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnRcbiAgICB2YXIgc2VsZWN0b3JzID0gdGhpcy5zZWxlY3RvcnNcbiAgICB0aGlzLnNlbGVjdG9ycyA9IG5ldyBTZWxlY3Rvckxpc3QodGhpcy5zZWxlY3RvcnMsIHskLCB3aW5kb3csIGRvY3VtZW50fSlcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBhbGwgc2VsZWN0b3JzIG9yIHJlY3Vyc2l2ZWx5IGZpbmQgYW5kIHJldHVybiBhbGwgY2hpbGQgc2VsZWN0b3JzIG9mIGEgcGFyZW50IHNlbGVjdG9yLlxuXHQgKiBAcGFyYW0gcGFyZW50U2VsZWN0b3JJZFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuICBnZXRBbGxTZWxlY3RvcnM6IGZ1bmN0aW9uIChwYXJlbnRTZWxlY3RvcklkKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3JzLmdldEFsbFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIG9ubHkgc2VsZWN0b3JzIHRoYXQgYXJlIGRpcmVjdGx5IHVuZGVyIGEgcGFyZW50XG5cdCAqIEBwYXJhbSBwYXJlbnRTZWxlY3RvcklkXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldERpcmVjdENoaWxkU2VsZWN0b3JzOiBmdW5jdGlvbiAocGFyZW50U2VsZWN0b3JJZCkge1xuICAgIHJldHVybiB0aGlzLnNlbGVjdG9ycy5nZXREaXJlY3RDaGlsZFNlbGVjdG9ycyhwYXJlbnRTZWxlY3RvcklkKVxuICB9LFxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGFsbCBzZWxlY3RvciBpZCBwYXJhbWV0ZXJzXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG4gIGdldFNlbGVjdG9ySWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGlkcyA9IFsnX3Jvb3QnXVxuICAgIHRoaXMuc2VsZWN0b3JzLmZvckVhY2goZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICBpZHMucHVzaChzZWxlY3Rvci5pZClcbiAgICB9KVxuICAgIHJldHVybiBpZHNcbiAgfSxcblxuXHQvKipcblx0ICogUmV0dXJucyBvbmx5IHNlbGVjdG9yIGlkcyB3aGljaCBjYW4gaGF2ZSBjaGlsZCBzZWxlY3RvcnNcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cbiAgZ2V0UG9zc2libGVQYXJlbnRTZWxlY3RvcklkczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBpZHMgPSBbJ19yb290J11cbiAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgaWYgKHNlbGVjdG9yLmNhbkhhdmVDaGlsZFNlbGVjdG9ycygpKSB7XG4gICAgICAgIGlkcy5wdXNoKHNlbGVjdG9yLmlkKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGlkc1xuICB9LFxuXG4gIGdldFN0YXJ0VXJsczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdGFydFVybHMgPSB0aGlzLnN0YXJ0VXJsXG5cdFx0Ly8gc2luZ2xlIHN0YXJ0IHVybFxuICAgIGlmICh0aGlzLnN0YXJ0VXJsLnB1c2ggPT09IHVuZGVmaW5lZCkge1xuICAgICAgc3RhcnRVcmxzID0gW3N0YXJ0VXJsc11cbiAgICB9XG5cbiAgICB2YXIgdXJscyA9IFtdXG4gICAgc3RhcnRVcmxzLmZvckVhY2goZnVuY3Rpb24gKHN0YXJ0VXJsKSB7XG5cdFx0XHQvLyB6ZXJvIHBhZGRpbmcgaGVscGVyXG4gICAgICB2YXIgbHBhZCA9IGZ1bmN0aW9uIChzdHIsIGxlbmd0aCkge1xuICAgICAgICB3aGlsZSAoc3RyLmxlbmd0aCA8IGxlbmd0aCkgeyBzdHIgPSAnMCcgKyBzdHIgfVxuICAgICAgICByZXR1cm4gc3RyXG4gICAgICB9XG5cbiAgICAgIHZhciByZSA9IC9eKC4qPylcXFsoXFxkKylcXC0oXFxkKykoOihcXGQrKSk/XFxdKC4qKSQvXG4gICAgICB2YXIgbWF0Y2hlcyA9IHN0YXJ0VXJsLm1hdGNoKHJlKVxuICAgICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgdmFyIHN0YXJ0U3RyID0gbWF0Y2hlc1syXVxuICAgICAgICB2YXIgZW5kU3RyID0gbWF0Y2hlc1szXVxuICAgICAgICB2YXIgc3RhcnQgPSBwYXJzZUludChzdGFydFN0cilcbiAgICAgICAgdmFyIGVuZCA9IHBhcnNlSW50KGVuZFN0cilcbiAgICAgICAgdmFyIGluY3JlbWVudGFsID0gMVxuICAgICAgICBjb25zb2xlLmxvZyhtYXRjaGVzWzVdKVxuICAgICAgICBpZiAobWF0Y2hlc1s1XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaW5jcmVtZW50YWwgPSBwYXJzZUludChtYXRjaGVzWzVdKVxuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkgKz0gaW5jcmVtZW50YWwpIHtcblx0XHRcdFx0XHQvLyB3aXRoIHplcm8gcGFkZGluZ1xuICAgICAgICAgIGlmIChzdGFydFN0ci5sZW5ndGggPT09IGVuZFN0ci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHVybHMucHVzaChtYXRjaGVzWzFdICsgbHBhZChpLnRvU3RyaW5nKCksIHN0YXJ0U3RyLmxlbmd0aCkgKyBtYXRjaGVzWzZdKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cmxzLnB1c2gobWF0Y2hlc1sxXSArIGkgKyBtYXRjaGVzWzZdKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsc1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdXJscy5wdXNoKHN0YXJ0VXJsKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICByZXR1cm4gdXJsc1xuICB9LFxuXG4gIHVwZGF0ZVNlbGVjdG9yOiBmdW5jdGlvbiAoc2VsZWN0b3IsIHNlbGVjdG9yRGF0YSkge1xuXHRcdC8vIHNlbGVjdG9yIGlzIHVuZGVmaW5lZCB3aGVuIGNyZWF0aW5nIGEgbmV3IG9uZVxuICAgIGlmIChzZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG52YXIgJCA9IHRoaXMuJFxudmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxudmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gICAgICBzZWxlY3RvciA9IG5ldyBTZWxlY3RvcihzZWxlY3RvckRhdGEsIHskLCB3aW5kb3csIGRvY3VtZW50fSlcbiAgICB9XG5cblx0XHQvLyB1cGRhdGUgY2hpbGQgc2VsZWN0b3JzXG4gICAgaWYgKHNlbGVjdG9yLmlkICE9PSB1bmRlZmluZWQgJiYgc2VsZWN0b3IuaWQgIT09IHNlbGVjdG9yRGF0YS5pZCkge1xuICAgICAgdGhpcy5zZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoY3VycmVudFNlbGVjdG9yKSB7XG4gICAgICAgIGN1cnJlbnRTZWxlY3Rvci5yZW5hbWVQYXJlbnRTZWxlY3RvcihzZWxlY3Rvci5pZCwgc2VsZWN0b3JEYXRhLmlkKVxuICAgICAgfSlcblxuXHRcdFx0Ly8gdXBkYXRlIGN5Y2xpYyBzZWxlY3RvclxuICAgICAgdmFyIHBvcyA9IHNlbGVjdG9yRGF0YS5wYXJlbnRTZWxlY3RvcnMuaW5kZXhPZihzZWxlY3Rvci5pZClcbiAgICAgIGlmIChwb3MgIT09IC0xKSB7XG4gICAgICAgIHNlbGVjdG9yRGF0YS5wYXJlbnRTZWxlY3RvcnMuc3BsaWNlKHBvcywgMSwgc2VsZWN0b3JEYXRhLmlkKVxuICAgICAgfVxuICAgIH1cblxuICAgIHNlbGVjdG9yLnVwZGF0ZURhdGEoc2VsZWN0b3JEYXRhKVxuXG4gICAgaWYgKHRoaXMuZ2V0U2VsZWN0b3JJZHMoKS5pbmRleE9mKHNlbGVjdG9yLmlkKSA9PT0gLTEpIHtcbiAgICAgIHRoaXMuc2VsZWN0b3JzLnB1c2goc2VsZWN0b3IpXG4gICAgfVxuICB9LFxuICBkZWxldGVTZWxlY3RvcjogZnVuY3Rpb24gKHNlbGVjdG9yVG9EZWxldGUpIHtcbiAgICB0aGlzLnNlbGVjdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgaWYgKHNlbGVjdG9yLmhhc1BhcmVudFNlbGVjdG9yKHNlbGVjdG9yVG9EZWxldGUuaWQpKSB7XG4gICAgICAgIHNlbGVjdG9yLnJlbW92ZVBhcmVudFNlbGVjdG9yKHNlbGVjdG9yVG9EZWxldGUuaWQpXG4gICAgICAgIGlmIChzZWxlY3Rvci5wYXJlbnRTZWxlY3RvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5kZWxldGVTZWxlY3RvcihzZWxlY3RvcilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSlcblxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5zZWxlY3RvcnMpIHtcbiAgICAgIGlmICh0aGlzLnNlbGVjdG9yc1tpXS5pZCA9PT0gc2VsZWN0b3JUb0RlbGV0ZS5pZCkge1xuICAgICAgICB0aGlzLnNlbGVjdG9ycy5zcGxpY2UoaSwgMSlcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGdldERhdGFUYWJsZUlkOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lkLnJlcGxhY2UoL1xcLi9nLCAnXycpXG4gIH0sXG4gIGV4cG9ydFNpdGVtYXA6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2l0ZW1hcE9iaiA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcykpXG4gICAgZGVsZXRlIHNpdGVtYXBPYmouX3JldlxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShzaXRlbWFwT2JqKVxuICB9LFxuICBpbXBvcnRTaXRlbWFwOiBmdW5jdGlvbiAoc2l0ZW1hcEpTT04pIHtcbiAgICB2YXIgc2l0ZW1hcE9iaiA9IEpTT04ucGFyc2Uoc2l0ZW1hcEpTT04pXG4gICAgdGhpcy5pbml0RGF0YShzaXRlbWFwT2JqKVxuICB9LFxuXHQvLyByZXR1cm4gYSBsaXN0IG9mIGNvbHVtbnMgdGhhbiBjYW4gYmUgZXhwb3J0ZWRcbiAgZ2V0RGF0YUNvbHVtbnM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY29sdW1ucyA9IFtdXG4gICAgdGhpcy5zZWxlY3RvcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgIGNvbHVtbnMgPSBjb2x1bW5zLmNvbmNhdChzZWxlY3Rvci5nZXREYXRhQ29sdW1ucygpKVxuICAgIH0pXG5cbiAgICByZXR1cm4gY29sdW1uc1xuICB9LFxuICBnZXREYXRhRXhwb3J0Q3N2QmxvYjogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgd2luZG93ID0gdGhpcy53aW5kb3dcbiAgICB2YXIgY29sdW1ucyA9IHRoaXMuZ2V0RGF0YUNvbHVtbnMoKSxcbiAgICAgIGRlbGltaXRlciA9ICcsJyxcbiAgICAgIG5ld2xpbmUgPSAnXFxuJyxcbiAgICAgIGNzdkRhdGEgPSBbJ1xcdWZlZmYnXSAvLyB1dGYtOCBib20gY2hhclxuXG5cdFx0Ly8gaGVhZGVyXG4gICAgY3N2RGF0YS5wdXNoKGNvbHVtbnMuam9pbihkZWxpbWl0ZXIpICsgbmV3bGluZSlcblxuXHRcdC8vIGRhdGFcbiAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24gKHJvdykge1xuICAgICAgdmFyIHJvd0RhdGEgPSBbXVxuICAgICAgY29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uIChjb2x1bW4pIHtcbiAgICAgICAgdmFyIGNlbGxEYXRhID0gcm93W2NvbHVtbl1cbiAgICAgICAgaWYgKGNlbGxEYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjZWxsRGF0YSA9ICcnXG4gICAgICAgIH1cdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBjZWxsRGF0YSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICBjZWxsRGF0YSA9IEpTT04uc3RyaW5naWZ5KGNlbGxEYXRhKVxuICAgICAgICB9XG5cbiAgICAgICAgcm93RGF0YS5wdXNoKCdcIicgKyBjZWxsRGF0YS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpLnRyaW0oKSArICdcIicpXG4gICAgICB9KVxuICAgICAgY3N2RGF0YS5wdXNoKHJvd0RhdGEuam9pbihkZWxpbWl0ZXIpICsgbmV3bGluZSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIG5ldyB3aW5kb3cuQmxvYihjc3ZEYXRhLCB7dHlwZTogJ3RleHQvY3N2J30pXG4gIH0sXG4gIGdldFNlbGVjdG9yQnlJZDogZnVuY3Rpb24gKHNlbGVjdG9ySWQpIHtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RvcnMuZ2V0U2VsZWN0b3JCeUlkKHNlbGVjdG9ySWQpXG4gIH0sXG5cdC8qKlxuXHQgKiBDcmVhdGUgZnVsbCBjbG9uZSBvZiBzaXRlbWFwXG5cdCAqIEByZXR1cm5zIHtTaXRlbWFwfVxuXHQgKi9cbiAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgJCA9IHRoaXMuJFxudmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxudmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gICAgdmFyIGNsb25lZEpTT04gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMpKVxuICAgIHZhciBzaXRlbWFwID0gbmV3IFNpdGVtYXAoY2xvbmVkSlNPTiwgeyQsIGRvY3VtZW50LCB3aW5kb3d9KVxuICAgIHJldHVybiBzaXRlbWFwXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTaXRlbWFwXG4iLCJ2YXIgU2l0ZW1hcCA9IHJlcXVpcmUoJy4vU2l0ZW1hcCcpXG5cbi8qKlxuICogRnJvbSBkZXZ0b29scyBwYW5lbCB0aGVyZSBpcyBubyBwb3NzaWJpbGl0eSB0byBleGVjdXRlIFhIUiByZXF1ZXN0cy4gU28gYWxsIHJlcXVlc3RzIHRvIGEgcmVtb3RlIENvdWNoRGIgbXVzdCBiZVxuICogaGFuZGxlZCB0aHJvdWdoIEJhY2tncm91bmQgcGFnZS4gU3RvcmVEZXZ0b29scyBpcyBhIHNpbXBseSBhIHByb3h5IHN0b3JlXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIFN0b3JlRGV2dG9vbHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB0aGlzLiQgPSBvcHRpb25zLiRcbnRoaXMuZG9jdW1lbnQgPSBvcHRpb25zLmRvY3VtZW50XG50aGlzLndpbmRvdyA9IG9wdGlvbnMud2luZG93XG4gIGlmICghdGhpcy4kKSB0aHJvdyBuZXcgRXJyb3IoJ2pxdWVyeSByZXF1aXJlZCcpXG5pZiAoIXRoaXMuZG9jdW1lbnQpIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZG9jdW1lbnRcIilcbmlmKCF0aGlzLndpbmRvdyl0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHdpbmRvd1wiKVxufVxuXG5TdG9yZURldnRvb2xzLnByb3RvdHlwZSA9IHtcbiAgY3JlYXRlU2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXAsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBjcmVhdGVTaXRlbWFwOiB0cnVlLFxuICAgICAgc2l0ZW1hcDogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSlcbiAgICB9XG5cbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZShyZXF1ZXN0LCBmdW5jdGlvbiAoY2FsbGJhY2tGbiwgb3JpZ2luYWxTaXRlbWFwLCBuZXdTaXRlbWFwKSB7XG4gICAgICBvcmlnaW5hbFNpdGVtYXAuX3JldiA9IG5ld1NpdGVtYXAuX3JldlxuICAgICAgY2FsbGJhY2tGbihvcmlnaW5hbFNpdGVtYXApXG4gICAgfS5iaW5kKHRoaXMsIGNhbGxiYWNrLCBzaXRlbWFwKSlcbiAgfSxcbiAgc2F2ZVNpdGVtYXA6IGZ1bmN0aW9uIChzaXRlbWFwLCBjYWxsYmFjaykge1xuICAgIHRoaXMuY3JlYXRlU2l0ZW1hcChzaXRlbWFwLCBjYWxsYmFjaylcbiAgfSxcbiAgZGVsZXRlU2l0ZW1hcDogZnVuY3Rpb24gKHNpdGVtYXAsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBkZWxldGVTaXRlbWFwOiB0cnVlLFxuICAgICAgc2l0ZW1hcDogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzaXRlbWFwKSlcbiAgICB9XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICBjYWxsYmFjaygpXG4gICAgfSlcbiAgfSxcbiAgZ2V0QWxsU2l0ZW1hcHM6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciAkID0gdGhpcy4kXG52YXIgZG9jdW1lbnQgPSB0aGlzLmRvY3VtZW50XG52YXIgd2luZG93ID0gdGhpcy53aW5kb3dcbiAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgIGdldEFsbFNpdGVtYXBzOiB0cnVlXG4gICAgfVxuXG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICB2YXIgc2l0ZW1hcHMgPSBbXVxuXG4gICAgICBmb3IgKHZhciBpIGluIHJlc3BvbnNlKSB7XG4gICAgICAgIHNpdGVtYXBzLnB1c2gobmV3IFNpdGVtYXAocmVzcG9uc2VbaV0sIHskLCBkb2N1bWVudCwgd2luZG93fSkpXG4gICAgICB9XG4gICAgICBjYWxsYmFjayhzaXRlbWFwcylcbiAgICB9KVxuICB9LFxuICBnZXRTaXRlbWFwRGF0YTogZnVuY3Rpb24gKHNpdGVtYXAsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcXVlc3QgPSB7XG4gICAgICBnZXRTaXRlbWFwRGF0YTogdHJ1ZSxcbiAgICAgIHNpdGVtYXA6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2l0ZW1hcCkpXG4gICAgfVxuXG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICBjYWxsYmFjayhyZXNwb25zZSlcbiAgICB9KVxuICB9LFxuICBzaXRlbWFwRXhpc3RzOiBmdW5jdGlvbiAoc2l0ZW1hcElkLCBjYWxsYmFjaykge1xuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgc2l0ZW1hcEV4aXN0czogdHJ1ZSxcbiAgICAgIHNpdGVtYXBJZDogc2l0ZW1hcElkXG4gICAgfVxuXG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICBjYWxsYmFjayhyZXNwb25zZSlcbiAgICB9KVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmVEZXZ0b29sc1xuIiwidmFyIENzc1NlbGVjdG9yID0gcmVxdWlyZSgnY3NzLXNlbGVjdG9yJykuQ3NzU2VsZWN0b3Jcbi8vIFRPRE8gZ2V0IHJpZCBvZiBqcXVlcnlcblxuLyoqXG4gKiBPbmx5IEVsZW1lbnRzIHVuaXF1ZSB3aWxsIGJlIGFkZGVkIHRvIHRoaXMgYXJyYXlcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBVbmlxdWVFbGVtZW50TGlzdCAoY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUsIG9wdGlvbnMpIHtcbiAgdmFyICQgPSBvcHRpb25zLiRcbiAgdmFyIHdpbmRvdyA9IG9wdGlvbnMud2luZG93XG4gIHZhciBkb2N1bWVudCA9IG9wdGlvbnMuZG9jdW1lbnRcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJyQnLCB7XG4gICAgdmFsdWU6ICQsXG4gICAgZW51bWVyYWJsZTogZmFsc2VcbiAgfSlcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd3aW5kb3cnLCB7XG4gICAgdmFsdWU6IHdpbmRvdyxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICB9KVxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2RvY3VtZW50Jywge1xuICAgIHZhbHVlOiBkb2N1bWVudCxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICB9KVxuICBpZiAoIXRoaXMuJCkgdGhyb3cgbmV3IEVycm9yKCdqcXVlcnkgcmVxdWlyZWQnKVxuICBpZiAoIXRoaXMuZG9jdW1lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGRvY3VtZW50XCIpXG4gIH1cbiAgaWYoIXRoaXMud2luZG93KSB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHdpbmRvd1wiKVxuICAgIHRoaXMuY2xpY2tFbGVtZW50VW5pcXVlbmVzc1R5cGUgPSBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZVxuICAgIHRoaXMuYWRkZWRFbGVtZW50cyA9IHt9XG4gIH1cblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlID0gW11cblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICB2YXIgJCA9IHRoaXMuJFxudmFyIGRvY3VtZW50ID0gdGhpcy5kb2N1bWVudFxudmFyIHdpbmRvdyA9IHRoaXMud2luZG93XG4gIGlmICh0aGlzLmlzQWRkZWQoZWxlbWVudCkpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfSBlbHNlIHtcbiAgICB2YXIgZWxlbWVudFVuaXF1ZUlkID0gdGhpcy5nZXRFbGVtZW50VW5pcXVlSWQoZWxlbWVudClcbiAgICB0aGlzLmFkZGVkRWxlbWVudHNbZWxlbWVudFVuaXF1ZUlkXSA9IHRydWVcbiAgICBBcnJheS5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsICQoZWxlbWVudCkuY2xvbmUodHJ1ZSlbMF0pXG4gICAgcmV0dXJuIHRydWVcbiAgfVxufVxuXG5VbmlxdWVFbGVtZW50TGlzdC5wcm90b3R5cGUuZ2V0RWxlbWVudFVuaXF1ZUlkID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgdmFyICQgPSB0aGlzLiRcbnZhciBkb2N1bWVudCA9IHRoaXMuZG9jdW1lbnRcbnZhciB3aW5kb3cgPSB0aGlzLndpbmRvd1xuICBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZVRleHQnKSB7XG4gICAgdmFyIGVsZW1lbnRUZXh0ID0gJChlbGVtZW50KS50ZXh0KCkudHJpbSgpXG4gICAgcmV0dXJuIGVsZW1lbnRUZXh0XG4gIH0gZWxzZSBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZUhUTUxUZXh0Jykge1xuICAgIHZhciBlbGVtZW50SFRNTCA9ICQoXCI8ZGl2IGNsYXNzPSctd2ViLXNjcmFwZXItc2hvdWxkLW5vdC1iZS12aXNpYmxlJz5cIikuYXBwZW5kKCQoZWxlbWVudCkuZXEoMCkuY2xvbmUoKSkuaHRtbCgpXG4gICAgcmV0dXJuIGVsZW1lbnRIVE1MXG4gIH0gZWxzZSBpZiAodGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSA9PT0gJ3VuaXF1ZUhUTUwnKSB7XG5cdFx0Ly8gZ2V0IGVsZW1lbnQgd2l0aG91dCB0ZXh0XG4gICAgdmFyICRlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKS5jbG9uZSgpXG5cbiAgICB2YXIgcmVtb3ZlVGV4dCA9IGZ1bmN0aW9uICgkZWxlbWVudCkge1xuICAgICAgJGVsZW1lbnQuY29udGVudHMoKVxuXHRcdFx0XHQuZmlsdGVyKGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMubm9kZVR5cGUgIT09IDMpIHtcbiAgICByZW1vdmVUZXh0KCQodGhpcykpXG4gIH1cbiAgcmV0dXJuIHRoaXMubm9kZVR5cGUgPT0gMyAvLyBOb2RlLlRFWFRfTk9ERVxufSkucmVtb3ZlKClcbiAgICB9XG4gICAgcmVtb3ZlVGV4dCgkZWxlbWVudClcblxuICAgIHZhciBlbGVtZW50SFRNTCA9ICQoXCI8ZGl2IGNsYXNzPSctd2ViLXNjcmFwZXItc2hvdWxkLW5vdC1iZS12aXNpYmxlJz5cIikuYXBwZW5kKCRlbGVtZW50KS5odG1sKClcbiAgICByZXR1cm4gZWxlbWVudEhUTUxcbiAgfSBlbHNlIGlmICh0aGlzLmNsaWNrRWxlbWVudFVuaXF1ZW5lc3NUeXBlID09PSAndW5pcXVlQ1NTU2VsZWN0b3InKSB7XG4gICAgdmFyIGNzID0gbmV3IENzc1NlbGVjdG9yKHtcbiAgICAgIGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjogZmFsc2UsXG4gICAgICBwYXJlbnQ6ICQoJ2JvZHknKVswXSxcbiAgICAgIGVuYWJsZVJlc3VsdFN0cmlwcGluZzogZmFsc2VcbiAgICB9KVxuICAgIHZhciBDU1NTZWxlY3RvciA9IGNzLmdldENzc1NlbGVjdG9yKFtlbGVtZW50XSlcbiAgICByZXR1cm4gQ1NTU2VsZWN0b3JcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyAnSW52YWxpZCBjbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZSAnICsgdGhpcy5jbGlja0VsZW1lbnRVbmlxdWVuZXNzVHlwZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVW5pcXVlRWxlbWVudExpc3RcblxuVW5pcXVlRWxlbWVudExpc3QucHJvdG90eXBlLmlzQWRkZWQgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICB2YXIgZWxlbWVudFVuaXF1ZUlkID0gdGhpcy5nZXRFbGVtZW50VW5pcXVlSWQoZWxlbWVudClcbiAgdmFyIGlzQWRkZWQgPSBlbGVtZW50VW5pcXVlSWQgaW4gdGhpcy5hZGRlZEVsZW1lbnRzXG4gIHJldHVybiBpc0FkZGVkXG59XG4iLCJ2YXIganF1ZXJ5ID0gcmVxdWlyZSgnanF1ZXJ5LWRlZmVycmVkJylcbnZhciBCYWNrZ3JvdW5kU2NyaXB0ID0gcmVxdWlyZSgnLi9CYWNrZ3JvdW5kU2NyaXB0Jylcbi8qKlxuICogQHBhcmFtIGxvY2F0aW9uXHRjb25maWd1cmUgZnJvbSB3aGVyZSB0aGUgY29udGVudCBzY3JpcHQgaXMgYmVpbmcgYWNjZXNzZWQgKENvbnRlbnRTY3JpcHQsIEJhY2tncm91bmRQYWdlLCBEZXZUb29scylcbiAqIEByZXR1cm5zIEJhY2tncm91bmRTY3JpcHRcbiAqL1xudmFyIGdldEJhY2tncm91bmRTY3JpcHQgPSBmdW5jdGlvbiAobG9jYXRpb24pIHtcbiAgLy8gSGFuZGxlIGNhbGxzIGZyb20gZGlmZmVyZW50IHBsYWNlc1xuICBpZiAobG9jYXRpb24gPT09ICdCYWNrZ3JvdW5kU2NyaXB0Jykge1xuICAgIHJldHVybiBCYWNrZ3JvdW5kU2NyaXB0XG4gIH0gZWxzZSBpZiAobG9jYXRpb24gPT09ICdEZXZUb29scycgfHwgbG9jYXRpb24gPT09ICdDb250ZW50U2NyaXB0Jykge1xuICAgIC8vIGlmIGNhbGxlZCB3aXRoaW4gYmFja2dyb3VuZCBzY3JpcHQgcHJveHkgY2FsbHMgdG8gY29udGVudCBzY3JpcHRcbiAgICB2YXIgYmFja2dyb3VuZFNjcmlwdCA9IHt9XG5cbiAgICBPYmplY3Qua2V5cyhCYWNrZ3JvdW5kU2NyaXB0KS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICBpZiAodHlwZW9mIEJhY2tncm91bmRTY3JpcHRbYXR0cl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgYmFja2dyb3VuZFNjcmlwdFthdHRyXSA9IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gICAgICAgICAgdmFyIHJlcVRvQmFja2dyb3VuZFNjcmlwdCA9IHtcbiAgICAgICAgICAgIGJhY2tncm91bmRTY3JpcHRDYWxsOiB0cnVlLFxuICAgICAgICAgICAgZm46IGF0dHIsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGRlZmVycmVkUmVzcG9uc2UgPSBqcXVlcnkuRGVmZXJyZWQoKVxuXG4gICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UocmVxVG9CYWNrZ3JvdW5kU2NyaXB0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGRlZmVycmVkUmVzcG9uc2UucmVzb2x2ZShyZXNwb25zZSlcbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgcmV0dXJuIGRlZmVycmVkUmVzcG9uc2VcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFja2dyb3VuZFNjcmlwdFthdHRyXSA9IEJhY2tncm91bmRTY3JpcHRbYXR0cl1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIGJhY2tncm91bmRTY3JpcHRcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQmFja2dyb3VuZFNjcmlwdCBpbml0aWFsaXphdGlvbiAtICcgKyBsb2NhdGlvbilcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldEJhY2tncm91bmRTY3JpcHRcbiIsInZhciBnZXRCYWNrZ3JvdW5kU2NyaXB0ID0gcmVxdWlyZSgnLi9nZXRCYWNrZ3JvdW5kU2NyaXB0JylcbnZhciBDb250ZW50U2NyaXB0ID0gcmVxdWlyZSgnLi9Db250ZW50U2NyaXB0Jylcbi8qKlxuICpcbiAqIEBwYXJhbSBsb2NhdGlvblx0Y29uZmlndXJlIGZyb20gd2hlcmUgdGhlIGNvbnRlbnQgc2NyaXB0IGlzIGJlaW5nIGFjY2Vzc2VkIChDb250ZW50U2NyaXB0LCBCYWNrZ3JvdW5kUGFnZSwgRGV2VG9vbHMpXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogQHJldHVybnMgQ29udGVudFNjcmlwdFxuICovXG52YXIgZ2V0Q29udGVudFNjcmlwdCA9IGZ1bmN0aW9uIChsb2NhdGlvbikge1xuICB2YXIgY29udGVudFNjcmlwdFxuXG4gIC8vIEhhbmRsZSBjYWxscyBmcm9tIGRpZmZlcmVudCBwbGFjZXNcbiAgaWYgKGxvY2F0aW9uID09PSAnQ29udGVudFNjcmlwdCcpIHtcbiAgICBjb250ZW50U2NyaXB0ID0gQ29udGVudFNjcmlwdFxuICAgIGNvbnRlbnRTY3JpcHQuYmFja2dyb3VuZFNjcmlwdCA9IGdldEJhY2tncm91bmRTY3JpcHQoJ0NvbnRlbnRTY3JpcHQnKVxuICAgIHJldHVybiBjb250ZW50U2NyaXB0XG4gIH0gZWxzZSBpZiAobG9jYXRpb24gPT09ICdCYWNrZ3JvdW5kU2NyaXB0JyB8fCBsb2NhdGlvbiA9PT0gJ0RldlRvb2xzJykge1xuICAgIHZhciBiYWNrZ3JvdW5kU2NyaXB0ID0gZ2V0QmFja2dyb3VuZFNjcmlwdChsb2NhdGlvbilcblxuICAgIC8vIGlmIGNhbGxlZCB3aXRoaW4gYmFja2dyb3VuZCBzY3JpcHQgcHJveHkgY2FsbHMgdG8gY29udGVudCBzY3JpcHRcbiAgICBjb250ZW50U2NyaXB0ID0ge31cbiAgICBPYmplY3Qua2V5cyhDb250ZW50U2NyaXB0KS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICBpZiAodHlwZW9mIENvbnRlbnRTY3JpcHRbYXR0cl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29udGVudFNjcmlwdFthdHRyXSA9IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gICAgICAgICAgdmFyIHJlcVRvQ29udGVudFNjcmlwdCA9IHtcbiAgICAgICAgICAgIGNvbnRlbnRTY3JpcHRDYWxsOiB0cnVlLFxuICAgICAgICAgICAgZm46IGF0dHIsXG4gICAgICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIGJhY2tncm91bmRTY3JpcHQuZXhlY3V0ZUNvbnRlbnRTY3JpcHQocmVxVG9Db250ZW50U2NyaXB0KVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb250ZW50U2NyaXB0W2F0dHJdID0gQ29udGVudFNjcmlwdFthdHRyXVxuICAgICAgfVxuICAgIH0pXG4gICAgY29udGVudFNjcmlwdC5iYWNrZ3JvdW5kU2NyaXB0ID0gYmFja2dyb3VuZFNjcmlwdFxuICAgIHJldHVybiBjb250ZW50U2NyaXB0XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIENvbnRlbnRTY3JpcHQgaW5pdGlhbGl6YXRpb24gLSAnICsgbG9jYXRpb24pXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRDb250ZW50U2NyaXB0XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0Q3NzU2VsZWN0b3IsXG5cdEVsZW1lbnRTZWxlY3Rvcixcblx0RWxlbWVudFNlbGVjdG9yTGlzdFxufVxuXG5cbmZ1bmN0aW9uIENzc1NlbGVjdG9yIChvcHRpb25zKSB7XG5cblx0dmFyIG1lID0gdGhpcztcblxuXHQvLyBkZWZhdWx0c1xuXHR0aGlzLmlnbm9yZWRUYWdzID0gWydmb250JywgJ2InLCAnaScsICdzJ107XG5cdHRoaXMucGFyZW50ID0gb3B0aW9ucy5kb2N1bWVudCB8fCBvcHRpb25zLnBhcmVudFxuXHR0aGlzLmRvY3VtZW50ID0gb3B0aW9ucy5kb2N1bWVudCB8fCBvcHRpb25zLnBhcmVudCBcblx0dGhpcy5pZ25vcmVkQ2xhc3NCYXNlID0gZmFsc2U7XG5cdHRoaXMuZW5hYmxlUmVzdWx0U3RyaXBwaW5nID0gdHJ1ZTtcblx0dGhpcy5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3IgPSBmYWxzZTtcblx0dGhpcy5pZ25vcmVkQ2xhc3NlcyA9IFtdO1xuICAgIHRoaXMuYWxsb3dNdWx0aXBsZVNlbGVjdG9ycyA9IGZhbHNlO1xuXHR0aGlzLnF1ZXJ5ID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG5cdFx0cmV0dXJuIG1lLnBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcblx0fTtcblxuXHQvLyBvdmVycmlkZXMgZGVmYXVsdHMgd2l0aCBvcHRpb25zXG5cdGZvciAodmFyIGkgaW4gb3B0aW9ucykge1xuXHRcdHRoaXNbaV0gPSBvcHRpb25zW2ldO1xuXHR9XG59O1xuXG4vLyBUT0RPIHJlZmFjdG9yIGVsZW1lbnQgc2VsZWN0b3IgbGlzdCBpbnRvIGEgfiBjbGFzc1xuZnVuY3Rpb24gRWxlbWVudFNlbGVjdG9yIChlbGVtZW50LCBpZ25vcmVkQ2xhc3Nlcykge1xuXG5cdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cdHRoaXMuaXNEaXJlY3RDaGlsZCA9IHRydWU7XG5cdHRoaXMudGFnID0gZWxlbWVudC5sb2NhbE5hbWU7XG5cdHRoaXMudGFnID0gdGhpcy50YWcucmVwbGFjZSgvOi9nLCAnXFxcXDonKTtcblxuXHQvLyBudGgtb2YtY2hpbGQobisxKVxuXHR0aGlzLmluZGV4biA9IG51bGw7XG5cdHRoaXMuaW5kZXggPSAxO1xuXHR0aGlzLmlkID0gbnVsbDtcblx0dGhpcy5jbGFzc2VzID0gbmV3IEFycmF5KCk7XG5cblx0Ly8gZG8gbm90IGFkZCBhZGRpdGluYWwgaW5mbyB0byBodG1sLCBib2R5IHRhZ3MuXG5cdC8vIGh0bWw6bnRoLW9mLXR5cGUoMSkgY2Fubm90IGJlIHNlbGVjdGVkXG5cdGlmKHRoaXMudGFnID09PSAnaHRtbCcgfHwgdGhpcy50YWcgPT09ICdIVE1MJ1xuXHRcdHx8IHRoaXMudGFnID09PSAnYm9keScgfHwgdGhpcy50YWcgPT09ICdCT0RZJykge1xuXHRcdHRoaXMuaW5kZXggPSBudWxsO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmIChlbGVtZW50LnBhcmVudE5vZGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdC8vIG50aC1jaGlsZFxuXHRcdC8vdGhpcy5pbmRleCA9IFtdLmluZGV4T2YuY2FsbChlbGVtZW50LnBhcmVudE5vZGUuY2hpbGRyZW4sIGVsZW1lbnQpKzE7XG5cblx0XHQvLyBudGgtb2YtdHlwZVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudC5wYXJlbnROb2RlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgY2hpbGQgPSBlbGVtZW50LnBhcmVudE5vZGUuY2hpbGRyZW5baV07XG5cdFx0XHRpZiAoY2hpbGQgPT09IGVsZW1lbnQpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2hpbGQudGFnTmFtZSA9PT0gZWxlbWVudC50YWdOYW1lKSB7XG5cdFx0XHRcdHRoaXMuaW5kZXgrKztcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAoZWxlbWVudC5pZCAhPT0gJycpIHtcblx0XHRpZiAodHlwZW9mIGVsZW1lbnQuaWQgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHR0aGlzLmlkID0gZWxlbWVudC5pZDtcblx0XHRcdHRoaXMuaWQgPSB0aGlzLmlkLnJlcGxhY2UoLzovZywgJ1xcXFw6Jyk7XG5cdFx0fVxuXHR9XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50LmNsYXNzTGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBjY2xhc3MgPSBlbGVtZW50LmNsYXNzTGlzdFtpXTtcblx0XHRpZiAoaWdub3JlZENsYXNzZXMuaW5kZXhPZihjY2xhc3MpID09PSAtMSkge1xuXHRcdFx0Y2NsYXNzID0gY2NsYXNzLnJlcGxhY2UoLzovZywgJ1xcXFw6Jyk7XG5cdFx0XHR0aGlzLmNsYXNzZXMucHVzaChjY2xhc3MpO1xuXHRcdH1cblx0fVxufTtcblxuZnVuY3Rpb24gRWxlbWVudFNlbGVjdG9yTGlzdCAoQ3NzU2VsZWN0b3IpIHtcblx0dGhpcy5Dc3NTZWxlY3RvciA9IENzc1NlbGVjdG9yO1xufTtcblxuRWxlbWVudFNlbGVjdG9yTGlzdC5wcm90b3R5cGUgPSBuZXcgQXJyYXkoKTtcblxuRWxlbWVudFNlbGVjdG9yTGlzdC5wcm90b3R5cGUuZ2V0Q3NzU2VsZWN0b3IgPSBmdW5jdGlvbiAoKSB7XG5cblx0dmFyIHJlc3VsdFNlbGVjdG9ycyA9IFtdO1xuXG5cdC8vIFRERFxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgc2VsZWN0b3IgPSB0aGlzW2ldO1xuXG5cdFx0dmFyIGlzRmlyc3RTZWxlY3RvciA9IGkgPT09IHRoaXMubGVuZ3RoLTE7XG5cdFx0dmFyIHJlc3VsdFNlbGVjdG9yID0gc2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3IoaXNGaXJzdFNlbGVjdG9yKTtcblxuXHRcdGlmICh0aGlzLkNzc1NlbGVjdG9yLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3Rvcikge1xuXHRcdFx0aWYgKHNlbGVjdG9yLnRhZyA9PT0gJ3RyJykge1xuXHRcdFx0XHRpZiAoc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlbi5sZW5ndGggPT09IDIpIHtcblx0XHRcdFx0XHRpZiAoc2VsZWN0b3IuZWxlbWVudC5jaGlsZHJlblswXS50YWdOYW1lID09PSAnVEQnXG5cdFx0XHRcdFx0XHR8fCBzZWxlY3Rvci5lbGVtZW50LmNoaWxkcmVuWzBdLnRhZ05hbWUgPT09ICdUSCdcblx0XHRcdFx0XHRcdHx8IHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW5bMF0udGFnTmFtZSA9PT0gJ1RSJykge1xuXG5cdFx0XHRcdFx0XHR2YXIgdGV4dCA9IHNlbGVjdG9yLmVsZW1lbnQuY2hpbGRyZW5bMF0udGV4dENvbnRlbnQ7XG5cdFx0XHRcdFx0XHR0ZXh0ID0gdGV4dC50cmltKCk7XG5cblx0XHRcdFx0XHRcdC8vIGVzY2FwZSBxdW90ZXNcblx0XHRcdFx0XHRcdHRleHQucmVwbGFjZSgvKFxcXFwqKSgnKS9nLCBmdW5jdGlvbiAoeCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgbCA9IHgubGVuZ3RoO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gKGwgJSAyKSA/IHggOiB4LnN1YnN0cmluZygwLCBsIC0gMSkgKyBcIlxcXFwnXCI7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJlc3VsdFNlbGVjdG9yICs9IFwiOmNvbnRhaW5zKCdcIiArIHRleHQgKyBcIicpXCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmVzdWx0U2VsZWN0b3JzLnB1c2gocmVzdWx0U2VsZWN0b3IpO1xuXHR9XG5cblx0dmFyIHJlc3VsdENTU1NlbGVjdG9yID0gcmVzdWx0U2VsZWN0b3JzLnJldmVyc2UoKS5qb2luKCcgJyk7XG5cdHJldHVybiByZXN1bHRDU1NTZWxlY3Rvcjtcbn07XG5cbkVsZW1lbnRTZWxlY3Rvci5wcm90b3R5cGUgPSB7XG5cblx0Z2V0Q3NzU2VsZWN0b3I6IGZ1bmN0aW9uIChpc0ZpcnN0U2VsZWN0b3IpIHtcblxuXHRcdGlmKGlzRmlyc3RTZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRpc0ZpcnN0U2VsZWN0b3IgPSBmYWxzZTtcblx0XHR9XG5cblx0XHR2YXIgc2VsZWN0b3IgPSB0aGlzLnRhZztcblx0XHRpZiAodGhpcy5pZCAhPT0gbnVsbCkge1xuXHRcdFx0c2VsZWN0b3IgKz0gJyMnICsgdGhpcy5pZDtcblx0XHR9XG5cdFx0aWYgKHRoaXMuY2xhc3Nlcy5sZW5ndGgpIHtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jbGFzc2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHNlbGVjdG9yICs9IFwiLlwiICsgdGhpcy5jbGFzc2VzW2ldO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAodGhpcy5pbmRleCAhPT0gbnVsbCkge1xuXHRcdFx0c2VsZWN0b3IgKz0gJzpudGgtb2YtdHlwZSgnICsgdGhpcy5pbmRleCArICcpJztcblx0XHR9XG5cdFx0aWYgKHRoaXMuaW5kZXhuICE9PSBudWxsICYmIHRoaXMuaW5kZXhuICE9PSAtMSkge1xuXHRcdFx0c2VsZWN0b3IgKz0gJzpudGgtb2YtdHlwZShuKycgKyB0aGlzLmluZGV4biArICcpJztcblx0XHR9XG5cdFx0aWYodGhpcy5pc0RpcmVjdENoaWxkICYmIGlzRmlyc3RTZWxlY3RvciA9PT0gZmFsc2UpIHtcblx0XHRcdHNlbGVjdG9yID0gXCI+IFwiK3NlbGVjdG9yO1xuXHRcdH1cblxuXHRcdHJldHVybiBzZWxlY3Rvcjtcblx0fSxcblx0Ly8gbWVyZ2VzIHRoaXMgc2VsZWN0b3Igd2l0aCBhbm90aGVyIG9uZS5cblx0bWVyZ2U6IGZ1bmN0aW9uIChtZXJnZVNlbGVjdG9yKSB7XG5cblx0XHRpZiAodGhpcy50YWcgIT09IG1lcmdlU2VsZWN0b3IudGFnKSB7XG5cdFx0XHR0aHJvdyBcImRpZmZlcmVudCBlbGVtZW50IHNlbGVjdGVkICh0YWcpXCI7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuaW5kZXggIT09IG51bGwpIHtcblx0XHRcdGlmICh0aGlzLmluZGV4ICE9PSBtZXJnZVNlbGVjdG9yLmluZGV4KSB7XG5cblx0XHRcdFx0Ly8gdXNlIGluZGV4biBvbmx5IGZvciB0d28gZWxlbWVudHNcblx0XHRcdFx0aWYgKHRoaXMuaW5kZXhuID09PSBudWxsKSB7XG5cdFx0XHRcdFx0dmFyIGluZGV4biA9IE1hdGgubWluKG1lcmdlU2VsZWN0b3IuaW5kZXgsIHRoaXMuaW5kZXgpO1xuXHRcdFx0XHRcdGlmIChpbmRleG4gPiAxKSB7XG5cdFx0XHRcdFx0XHR0aGlzLmluZGV4biA9IE1hdGgubWluKG1lcmdlU2VsZWN0b3IuaW5kZXgsIHRoaXMuaW5kZXgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHR0aGlzLmluZGV4biA9IC0xO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpcy5pbmRleCA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYodGhpcy5pc0RpcmVjdENoaWxkID09PSB0cnVlKSB7XG5cdFx0XHR0aGlzLmlzRGlyZWN0Q2hpbGQgPSBtZXJnZVNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQ7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuaWQgIT09IG51bGwpIHtcblx0XHRcdGlmICh0aGlzLmlkICE9PSBtZXJnZVNlbGVjdG9yLmlkKSB7XG5cdFx0XHRcdHRoaXMuaWQgPSBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNsYXNzZXMubGVuZ3RoICE9PSAwKSB7XG5cdFx0XHR2YXIgY2xhc3NlcyA9IG5ldyBBcnJheSgpO1xuXG5cdFx0XHRmb3IgKHZhciBpIGluIHRoaXMuY2xhc3Nlcykge1xuXHRcdFx0XHR2YXIgY2NsYXNzID0gdGhpcy5jbGFzc2VzW2ldO1xuXHRcdFx0XHRpZiAobWVyZ2VTZWxlY3Rvci5jbGFzc2VzLmluZGV4T2YoY2NsYXNzKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRjbGFzc2VzLnB1c2goY2NsYXNzKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmNsYXNzZXMgPSBjbGFzc2VzO1xuXHRcdH1cblx0fVxufTtcblxuQ3NzU2VsZWN0b3IucHJvdG90eXBlID0ge1xuXHRtZXJnZUVsZW1lbnRTZWxlY3RvcnM6IGZ1bmN0aW9uIChuZXdTZWxlY29ycykge1xuXG5cdFx0aWYgKG5ld1NlbGVjb3JzLmxlbmd0aCA8IDEpIHtcblx0XHRcdHRocm93IFwiTm8gc2VsZWN0b3JzIHNwZWNpZmllZFwiO1xuXHRcdH1cblx0XHRlbHNlIGlmIChuZXdTZWxlY29ycy5sZW5ndGggPT09IDEpIHtcblx0XHRcdHJldHVybiBuZXdTZWxlY29yc1swXTtcblx0XHR9XG5cblx0XHQvLyBjaGVjayBzZWxlY3RvciB0b3RhbCBjb3VudFxuXHRcdHZhciBlbGVtZW50Q291bnRJblNlbGVjdG9yID0gbmV3U2VsZWNvcnNbMF0ubGVuZ3RoO1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbmV3U2VsZWNvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IG5ld1NlbGVjb3JzW2ldO1xuXHRcdFx0aWYgKHNlbGVjdG9yLmxlbmd0aCAhPT0gZWxlbWVudENvdW50SW5TZWxlY3Rvcikge1xuXHRcdFx0XHR0aHJvdyBcIkludmFsaWQgZWxlbWVudCBjb3VudCBpbiBzZWxlY3RvclwiO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIG1lcmdlIHNlbGVjdG9yc1xuXHRcdHZhciByZXN1bHRpbmdFbGVtZW50cyA9IG5ld1NlbGVjb3JzWzBdO1xuXHRcdGZvciAodmFyIGkgPSAxOyBpIDwgbmV3U2VsZWNvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBtZXJnZUVsZW1lbnRzID0gbmV3U2VsZWNvcnNbaV07XG5cblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgZWxlbWVudENvdW50SW5TZWxlY3RvcjsgaisrKSB7XG5cdFx0XHRcdHJlc3VsdGluZ0VsZW1lbnRzW2pdLm1lcmdlKG1lcmdlRWxlbWVudHNbal0pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0aW5nRWxlbWVudHM7XG5cdH0sXG5cdHN0cmlwU2VsZWN0b3I6IGZ1bmN0aW9uIChzZWxlY3RvcnMpIHtcblxuXHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0dmFyIGJhc2VTZWxlY3RlZEVsZW1lbnRzID0gdGhpcy5xdWVyeShjc3NTZWxldG9yKTtcblxuXHRcdHZhciBjb21wYXJlRWxlbWVudHMgPSBmdW5jdGlvbiAoZWxlbWVudHMpIHtcblx0XHRcdGlmIChiYXNlU2VsZWN0ZWRFbGVtZW50cy5sZW5ndGggIT09IGVsZW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgYmFzZVNlbGVjdGVkRWxlbWVudHMubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0aWYgKFtdLmluZGV4T2YuY2FsbChlbGVtZW50cywgYmFzZVNlbGVjdGVkRWxlbWVudHNbal0pID09PSAtMSkge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fTtcblx0XHQvLyBzdHJpcCBpbmRleGVzXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5pbmRleCAhPT0gbnVsbCkge1xuXHRcdFx0XHR2YXIgaW5kZXggPSBzZWxlY3Rvci5pbmRleDtcblx0XHRcdFx0c2VsZWN0b3IuaW5kZXggPSBudWxsO1xuXHRcdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0XHR2YXIgbmV3U2VsZWN0ZWRFbGVtZW50cyA9IHRoaXMucXVlcnkoY3NzU2VsZXRvcik7XG5cdFx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRcdHNlbGVjdG9yLmluZGV4ID0gaW5kZXg7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzdHJpcCBpc0RpcmVjdENoaWxkXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzZWxlY3RvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdGlmIChzZWxlY3Rvci5pc0RpcmVjdENoaWxkID09PSB0cnVlKSB7XG5cdFx0XHRcdHNlbGVjdG9yLmlzRGlyZWN0Q2hpbGQgPSBmYWxzZTtcblx0XHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdFx0dmFyIG5ld1NlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXHRcdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0XHRzZWxlY3Rvci5pc0RpcmVjdENoaWxkID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHN0cmlwIGlkc1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IuaWQgIT09IG51bGwpIHtcblx0XHRcdFx0dmFyIGlkID0gc2VsZWN0b3IuaWQ7XG5cdFx0XHRcdHNlbGVjdG9yLmlkID0gbnVsbDtcblx0XHRcdFx0dmFyIGNzc1NlbGV0b3IgPSBzZWxlY3RvcnMuZ2V0Q3NzU2VsZWN0b3IoKTtcblx0XHRcdFx0dmFyIG5ld1NlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXHRcdFx0XHQvLyBpZiByZXN1bHRzIGRvZXNuJ3QgbWF0Y2ggdGhlbiB1bmRvIGNoYW5nZXNcblx0XHRcdFx0aWYgKCFjb21wYXJlRWxlbWVudHMobmV3U2VsZWN0ZWRFbGVtZW50cykpIHtcblx0XHRcdFx0XHRzZWxlY3Rvci5pZCA9IGlkO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3RyaXAgY2xhc3Nlc1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgc2VsZWN0b3IgPSBzZWxlY3RvcnNbaV07XG5cdFx0XHRpZiAoc2VsZWN0b3IuY2xhc3Nlcy5sZW5ndGggIT09IDApIHtcblx0XHRcdFx0Zm9yICh2YXIgaiA9IHNlbGVjdG9yLmNsYXNzZXMubGVuZ3RoIC0gMTsgaiA+IDA7IGotLSkge1xuXHRcdFx0XHRcdHZhciBjY2xhc3MgPSBzZWxlY3Rvci5jbGFzc2VzW2pdO1xuXHRcdFx0XHRcdHNlbGVjdG9yLmNsYXNzZXMuc3BsaWNlKGosIDEpO1xuXHRcdFx0XHRcdHZhciBjc3NTZWxldG9yID0gc2VsZWN0b3JzLmdldENzc1NlbGVjdG9yKCk7XG5cdFx0XHRcdFx0dmFyIG5ld1NlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXHRcdFx0XHRcdC8vIGlmIHJlc3VsdHMgZG9lc24ndCBtYXRjaCB0aGVuIHVuZG8gY2hhbmdlc1xuXHRcdFx0XHRcdGlmICghY29tcGFyZUVsZW1lbnRzKG5ld1NlbGVjdGVkRWxlbWVudHMpKSB7XG5cdFx0XHRcdFx0XHRzZWxlY3Rvci5jbGFzc2VzLnNwbGljZShqLCAwLCBjY2xhc3MpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIHN0cmlwIHRhZ3Ncblx0XHRmb3IgKHZhciBpID0gc2VsZWN0b3JzLmxlbmd0aCAtIDE7IGkgPiAwOyBpLS0pIHtcblx0XHRcdHZhciBzZWxlY3RvciA9IHNlbGVjdG9yc1tpXTtcblx0XHRcdHNlbGVjdG9ycy5zcGxpY2UoaSwgMSk7XG5cdFx0XHR2YXIgY3NzU2VsZXRvciA9IHNlbGVjdG9ycy5nZXRDc3NTZWxlY3RvcigpO1xuXHRcdFx0dmFyIG5ld1NlbGVjdGVkRWxlbWVudHMgPSB0aGlzLnF1ZXJ5KGNzc1NlbGV0b3IpO1xuXHRcdFx0Ly8gaWYgcmVzdWx0cyBkb2Vzbid0IG1hdGNoIHRoZW4gdW5kbyBjaGFuZ2VzXG5cdFx0XHRpZiAoIWNvbXBhcmVFbGVtZW50cyhuZXdTZWxlY3RlZEVsZW1lbnRzKSkge1xuXHRcdFx0XHRzZWxlY3RvcnMuc3BsaWNlKGksIDAsIHNlbGVjdG9yKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gc2VsZWN0b3JzO1xuXHR9LFxuXHRnZXRFbGVtZW50U2VsZWN0b3JzOiBmdW5jdGlvbiAoZWxlbWVudHMsIHRvcCkge1xuXHRcdHZhciBlbGVtZW50U2VsZWN0b3JzID0gW107XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgZWxlbWVudCA9IGVsZW1lbnRzW2ldO1xuXHRcdFx0dmFyIGVsZW1lbnRTZWxlY3RvciA9IHRoaXMuZ2V0RWxlbWVudFNlbGVjdG9yKGVsZW1lbnQsIHRvcCk7XG5cdFx0XHRlbGVtZW50U2VsZWN0b3JzLnB1c2goZWxlbWVudFNlbGVjdG9yKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZWxlbWVudFNlbGVjdG9ycztcblx0fSxcblx0Z2V0RWxlbWVudFNlbGVjdG9yOiBmdW5jdGlvbiAoZWxlbWVudCwgdG9wKSB7XG5cblx0XHR2YXIgZWxlbWVudFNlbGVjdG9yTGlzdCA9IG5ldyBFbGVtZW50U2VsZWN0b3JMaXN0KHRoaXMpO1xuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRpZiAoZWxlbWVudCA9PT0gdGhpcy5wYXJlbnQpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChlbGVtZW50ID09PSB1bmRlZmluZWQgfHwgZWxlbWVudCA9PT0gdGhpcy5kb2N1bWVudCkge1xuXHRcdFx0XHR0aHJvdyAnZWxlbWVudCBpcyBub3QgYSBjaGlsZCBvZiB0aGUgZ2l2ZW4gcGFyZW50Jztcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLmlzSWdub3JlZFRhZyhlbGVtZW50LnRhZ05hbWUpKSB7XG5cblx0XHRcdFx0ZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodG9wID4gMCkge1xuXHRcdFx0XHR0b3AtLTtcblx0XHRcdFx0ZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBzZWxlY3RvciA9IG5ldyBFbGVtZW50U2VsZWN0b3IoZWxlbWVudCwgdGhpcy5pZ25vcmVkQ2xhc3Nlcyk7XG5cdFx0XHQvLyBkb2N1bWVudCBkb2VzIG5vdCBoYXZlIGEgdGFnTmFtZVxuXHRcdFx0aWYoZWxlbWVudC5wYXJlbnROb2RlID09PSB0aGlzLmRvY3VtZW50IHx8IHRoaXMuaXNJZ25vcmVkVGFnKGVsZW1lbnQucGFyZW50Tm9kZS50YWdOYW1lKSkge1xuXHRcdFx0XHRzZWxlY3Rvci5pc0RpcmVjdENoaWxkID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGVsZW1lbnRTZWxlY3Rvckxpc3QucHVzaChzZWxlY3Rvcik7XG5cdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xuXHRcdH1cblxuXHRcdHJldHVybiBlbGVtZW50U2VsZWN0b3JMaXN0O1xuXHR9LFxuXG4gICAgLyoqXG4gICAgICogQ29tcGFyZXMgd2hldGhlciB0d28gZWxlbWVudHMgYXJlIHNpbWlsYXIuIFNpbWlsYXIgZWxlbWVudHMgc2hvdWxkXG4gICAgICogaGF2ZSBhIGNvbW1vbiBwYXJyZW50IGFuZCBhbGwgcGFyZW50IGVsZW1lbnRzIHNob3VsZCBiZSB0aGUgc2FtZSB0eXBlLlxuICAgICAqIEBwYXJhbSBlbGVtZW50MVxuICAgICAqIEBwYXJhbSBlbGVtZW50MlxuICAgICAqL1xuICAgIGNoZWNrU2ltaWxhckVsZW1lbnRzOiBmdW5jdGlvbihlbGVtZW50MSwgZWxlbWVudDIpIHtcblxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuXG4gICAgICAgICAgICBpZihlbGVtZW50MS50YWdOYW1lICE9PSBlbGVtZW50Mi50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoZWxlbWVudDEgPT09IGVsZW1lbnQyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHN0b3AgYXQgYm9keSB0YWdcbiAgICAgICAgICAgIGlmIChlbGVtZW50MSA9PT0gdW5kZWZpbmVkIHx8IGVsZW1lbnQxLnRhZ05hbWUgPT09ICdib2R5J1xuICAgICAgICAgICAgICAgIHx8IGVsZW1lbnQxLnRhZ05hbWUgPT09ICdCT0RZJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChlbGVtZW50MiA9PT0gdW5kZWZpbmVkIHx8IGVsZW1lbnQyLnRhZ05hbWUgPT09ICdib2R5J1xuICAgICAgICAgICAgICAgIHx8IGVsZW1lbnQyLnRhZ05hbWUgPT09ICdCT0RZJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZWxlbWVudDEgPSBlbGVtZW50MS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgZWxlbWVudDIgPSBlbGVtZW50Mi5wYXJlbnROb2RlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdyb3VwcyBlbGVtZW50cyBpbnRvIGdyb3VwcyBpZiB0aGUgZW1lbGVudHMgYXJlIG5vdCBzaW1pbGFyXG4gICAgICogQHBhcmFtIGVsZW1lbnRzXG4gICAgICovXG4gICAgZ2V0RWxlbWVudEdyb3VwczogZnVuY3Rpb24oZWxlbWVudHMpIHtcblxuICAgICAgICAvLyBmaXJzdCBlbG1lbnQgaXMgaW4gdGhlIGZpcnN0IGdyb3VwXG4gICAgICAgIC8vIEBUT0RPIG1heWJlIGkgZG9udCBuZWVkIHRoaXM/XG4gICAgICAgIHZhciBncm91cHMgPSBbW2VsZW1lbnRzWzBdXV07XG5cbiAgICAgICAgZm9yKHZhciBpID0gMTsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudE5ldyA9IGVsZW1lbnRzW2ldO1xuICAgICAgICAgICAgdmFyIGFkZGVkVG9Hcm91cCA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IGdyb3Vwcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBncm91cCA9IGdyb3Vwc1tqXTtcbiAgICAgICAgICAgICAgICB2YXIgZWxlbWVudEdyb3VwID0gZ3JvdXBbMF07XG4gICAgICAgICAgICAgICAgaWYodGhpcy5jaGVja1NpbWlsYXJFbGVtZW50cyhlbGVtZW50TmV3LCBlbGVtZW50R3JvdXApKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyb3VwLnB1c2goZWxlbWVudE5ldyk7XG4gICAgICAgICAgICAgICAgICAgIGFkZGVkVG9Hcm91cCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gYWRkIG5ldyBncm91cFxuICAgICAgICAgICAgaWYoIWFkZGVkVG9Hcm91cCkge1xuICAgICAgICAgICAgICAgIGdyb3Vwcy5wdXNoKFtlbGVtZW50TmV3XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZ3JvdXBzO1xuICAgIH0sXG5cdGdldENzc1NlbGVjdG9yOiBmdW5jdGlvbiAoZWxlbWVudHMsIHRvcCkge1xuXG5cdFx0dG9wID0gdG9wIHx8IDA7XG5cblx0XHR2YXIgZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yID0gdGhpcy5lbmFibGVTbWFydFRhYmxlU2VsZWN0b3I7XG5cdFx0aWYgKGVsZW1lbnRzLmxlbmd0aCA+IDEpIHtcblx0XHRcdHRoaXMuZW5hYmxlU21hcnRUYWJsZVNlbGVjdG9yID0gZmFsc2U7XG5cdFx0fVxuXG4gICAgICAgIC8vIGdyb3VwIGVsZW1lbnRzIGludG8gc2ltaWxhcml0eSBncm91cHNcbiAgICAgICAgdmFyIGVsZW1lbnRHcm91cHMgPSB0aGlzLmdldEVsZW1lbnRHcm91cHMoZWxlbWVudHMpO1xuXG4gICAgICAgIHZhciByZXN1bHRDU1NTZWxlY3RvcjtcblxuICAgICAgICBpZih0aGlzLmFsbG93TXVsdGlwbGVTZWxlY3RvcnMpIHtcblxuICAgICAgICAgICAgdmFyIGdyb3VwU2VsZWN0b3JzID0gW107XG5cbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBlbGVtZW50R3JvdXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGdyb3VwRWxlbWVudHMgPSBlbGVtZW50R3JvdXBzW2ldO1xuXG4gICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRTZWxlY3RvcnMgPSB0aGlzLmdldEVsZW1lbnRTZWxlY3RvcnMoZ3JvdXBFbGVtZW50cywgdG9wKTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0U2VsZWN0b3IgPSB0aGlzLm1lcmdlRWxlbWVudFNlbGVjdG9ycyhlbGVtZW50U2VsZWN0b3JzKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5lbmFibGVSZXN1bHRTdHJpcHBpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0U2VsZWN0b3IgPSB0aGlzLnN0cmlwU2VsZWN0b3IocmVzdWx0U2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGdyb3VwU2VsZWN0b3JzLnB1c2gocmVzdWx0U2VsZWN0b3IuZ2V0Q3NzU2VsZWN0b3IoKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc3VsdENTU1NlbGVjdG9yID0gZ3JvdXBTZWxlY3RvcnMuam9pbignLCAnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmKGVsZW1lbnRHcm91cHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgXCJmb3VuZCBtdWx0aXBsZSBlbGVtZW50IGdyb3VwcywgYnV0IGFsbG93TXVsdGlwbGVTZWxlY3RvcnMgZGlzYWJsZWRcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGVsZW1lbnRTZWxlY3RvcnMgPSB0aGlzLmdldEVsZW1lbnRTZWxlY3RvcnMoZWxlbWVudHMsIHRvcCk7XG4gICAgICAgICAgICB2YXIgcmVzdWx0U2VsZWN0b3IgPSB0aGlzLm1lcmdlRWxlbWVudFNlbGVjdG9ycyhlbGVtZW50U2VsZWN0b3JzKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmVuYWJsZVJlc3VsdFN0cmlwcGluZykge1xuICAgICAgICAgICAgICAgIHJlc3VsdFNlbGVjdG9yID0gdGhpcy5zdHJpcFNlbGVjdG9yKHJlc3VsdFNlbGVjdG9yKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzdWx0Q1NTU2VsZWN0b3IgPSByZXN1bHRTZWxlY3Rvci5nZXRDc3NTZWxlY3RvcigpO1xuICAgICAgICB9XG5cblx0XHR0aGlzLmVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvciA9IGVuYWJsZVNtYXJ0VGFibGVTZWxlY3RvcjtcblxuXHRcdC8vIHN0cmlwIGRvd24gc2VsZWN0b3Jcblx0XHRyZXR1cm4gcmVzdWx0Q1NTU2VsZWN0b3I7XG5cdH0sXG5cdGlzSWdub3JlZFRhZzogZnVuY3Rpb24gKHRhZykge1xuXHRcdHJldHVybiB0aGlzLmlnbm9yZWRUYWdzLmluZGV4T2YodGFnLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcblx0fVxufTtcbiIsIlxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9qcXVlcnktZGVmZXJyZWQnKTsiLCJ2YXIgalF1ZXJ5ID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9qcXVlcnktY29yZS5qc1wiKSxcblx0Y29yZV9yc3BhY2UgPSAvXFxzKy87XG4vKipcbiogalF1ZXJ5IENhbGxiYWNrc1xuKlxuKiBDb2RlIGZyb206IGh0dHBzOi8vZ2l0aHViLmNvbS9qcXVlcnkvanF1ZXJ5L2Jsb2IvbWFzdGVyL3NyYy9jYWxsYmFja3MuanNcbipcbiovXG5cblxuLy8gU3RyaW5nIHRvIE9iamVjdCBvcHRpb25zIGZvcm1hdCBjYWNoZVxudmFyIG9wdGlvbnNDYWNoZSA9IHt9O1xuXG4vLyBDb252ZXJ0IFN0cmluZy1mb3JtYXR0ZWQgb3B0aW9ucyBpbnRvIE9iamVjdC1mb3JtYXR0ZWQgb25lcyBhbmQgc3RvcmUgaW4gY2FjaGVcbmZ1bmN0aW9uIGNyZWF0ZU9wdGlvbnMoIG9wdGlvbnMgKSB7XG5cdHZhciBvYmplY3QgPSBvcHRpb25zQ2FjaGVbIG9wdGlvbnMgXSA9IHt9O1xuXHRqUXVlcnkuZWFjaCggb3B0aW9ucy5zcGxpdCggY29yZV9yc3BhY2UgKSwgZnVuY3Rpb24oIF8sIGZsYWcgKSB7XG5cdFx0b2JqZWN0WyBmbGFnIF0gPSB0cnVlO1xuXHR9KTtcblx0cmV0dXJuIG9iamVjdDtcbn1cblxuLypcbiAqIENyZWF0ZSBhIGNhbGxiYWNrIGxpc3QgdXNpbmcgdGhlIGZvbGxvd2luZyBwYXJhbWV0ZXJzOlxuICpcbiAqXHRvcHRpb25zOiBhbiBvcHRpb25hbCBsaXN0IG9mIHNwYWNlLXNlcGFyYXRlZCBvcHRpb25zIHRoYXQgd2lsbCBjaGFuZ2UgaG93XG4gKlx0XHRcdHRoZSBjYWxsYmFjayBsaXN0IGJlaGF2ZXMgb3IgYSBtb3JlIHRyYWRpdGlvbmFsIG9wdGlvbiBvYmplY3RcbiAqXG4gKiBCeSBkZWZhdWx0IGEgY2FsbGJhY2sgbGlzdCB3aWxsIGFjdCBsaWtlIGFuIGV2ZW50IGNhbGxiYWNrIGxpc3QgYW5kIGNhbiBiZVxuICogXCJmaXJlZFwiIG11bHRpcGxlIHRpbWVzLlxuICpcbiAqIFBvc3NpYmxlIG9wdGlvbnM6XG4gKlxuICpcdG9uY2U6XHRcdFx0d2lsbCBlbnN1cmUgdGhlIGNhbGxiYWNrIGxpc3QgY2FuIG9ubHkgYmUgZmlyZWQgb25jZSAobGlrZSBhIERlZmVycmVkKVxuICpcbiAqXHRtZW1vcnk6XHRcdFx0d2lsbCBrZWVwIHRyYWNrIG9mIHByZXZpb3VzIHZhbHVlcyBhbmQgd2lsbCBjYWxsIGFueSBjYWxsYmFjayBhZGRlZFxuICpcdFx0XHRcdFx0YWZ0ZXIgdGhlIGxpc3QgaGFzIGJlZW4gZmlyZWQgcmlnaHQgYXdheSB3aXRoIHRoZSBsYXRlc3QgXCJtZW1vcml6ZWRcIlxuICpcdFx0XHRcdFx0dmFsdWVzIChsaWtlIGEgRGVmZXJyZWQpXG4gKlxuICpcdHVuaXF1ZTpcdFx0XHR3aWxsIGVuc3VyZSBhIGNhbGxiYWNrIGNhbiBvbmx5IGJlIGFkZGVkIG9uY2UgKG5vIGR1cGxpY2F0ZSBpbiB0aGUgbGlzdClcbiAqXG4gKlx0c3RvcE9uRmFsc2U6XHRpbnRlcnJ1cHQgY2FsbGluZ3Mgd2hlbiBhIGNhbGxiYWNrIHJldHVybnMgZmFsc2VcbiAqXG4gKi9cbmpRdWVyeS5DYWxsYmFja3MgPSBmdW5jdGlvbiggb3B0aW9ucyApIHtcblxuXHQvLyBDb252ZXJ0IG9wdGlvbnMgZnJvbSBTdHJpbmctZm9ybWF0dGVkIHRvIE9iamVjdC1mb3JtYXR0ZWQgaWYgbmVlZGVkXG5cdC8vICh3ZSBjaGVjayBpbiBjYWNoZSBmaXJzdClcblx0b3B0aW9ucyA9IHR5cGVvZiBvcHRpb25zID09PSBcInN0cmluZ1wiID9cblx0XHQoIG9wdGlvbnNDYWNoZVsgb3B0aW9ucyBdIHx8IGNyZWF0ZU9wdGlvbnMoIG9wdGlvbnMgKSApIDpcblx0XHRqUXVlcnkuZXh0ZW5kKCB7fSwgb3B0aW9ucyApO1xuXG5cdHZhciAvLyBMYXN0IGZpcmUgdmFsdWUgKGZvciBub24tZm9yZ2V0dGFibGUgbGlzdHMpXG5cdFx0bWVtb3J5LFxuXHRcdC8vIEZsYWcgdG8ga25vdyBpZiBsaXN0IHdhcyBhbHJlYWR5IGZpcmVkXG5cdFx0ZmlyZWQsXG5cdFx0Ly8gRmxhZyB0byBrbm93IGlmIGxpc3QgaXMgY3VycmVudGx5IGZpcmluZ1xuXHRcdGZpcmluZyxcblx0XHQvLyBGaXJzdCBjYWxsYmFjayB0byBmaXJlICh1c2VkIGludGVybmFsbHkgYnkgYWRkIGFuZCBmaXJlV2l0aClcblx0XHRmaXJpbmdTdGFydCxcblx0XHQvLyBFbmQgb2YgdGhlIGxvb3Agd2hlbiBmaXJpbmdcblx0XHRmaXJpbmdMZW5ndGgsXG5cdFx0Ly8gSW5kZXggb2YgY3VycmVudGx5IGZpcmluZyBjYWxsYmFjayAobW9kaWZpZWQgYnkgcmVtb3ZlIGlmIG5lZWRlZClcblx0XHRmaXJpbmdJbmRleCxcblx0XHQvLyBBY3R1YWwgY2FsbGJhY2sgbGlzdFxuXHRcdGxpc3QgPSBbXSxcblx0XHQvLyBTdGFjayBvZiBmaXJlIGNhbGxzIGZvciByZXBlYXRhYmxlIGxpc3RzXG5cdFx0c3RhY2sgPSAhb3B0aW9ucy5vbmNlICYmIFtdLFxuXHRcdC8vIEZpcmUgY2FsbGJhY2tzXG5cdFx0ZmlyZSA9IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0bWVtb3J5ID0gb3B0aW9ucy5tZW1vcnkgJiYgZGF0YTtcblx0XHRcdGZpcmVkID0gdHJ1ZTtcblx0XHRcdGZpcmluZ0luZGV4ID0gZmlyaW5nU3RhcnQgfHwgMDtcblx0XHRcdGZpcmluZ1N0YXJ0ID0gMDtcblx0XHRcdGZpcmluZ0xlbmd0aCA9IGxpc3QubGVuZ3RoO1xuXHRcdFx0ZmlyaW5nID0gdHJ1ZTtcblx0XHRcdGZvciAoIDsgbGlzdCAmJiBmaXJpbmdJbmRleCA8IGZpcmluZ0xlbmd0aDsgZmlyaW5nSW5kZXgrKyApIHtcblx0XHRcdFx0aWYgKCBsaXN0WyBmaXJpbmdJbmRleCBdLmFwcGx5KCBkYXRhWyAwIF0sIGRhdGFbIDEgXSApID09PSBmYWxzZSAmJiBvcHRpb25zLnN0b3BPbkZhbHNlICkge1xuXHRcdFx0XHRcdG1lbW9yeSA9IGZhbHNlOyAvLyBUbyBwcmV2ZW50IGZ1cnRoZXIgY2FsbHMgdXNpbmcgYWRkXG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGZpcmluZyA9IGZhbHNlO1xuXHRcdFx0aWYgKCBsaXN0ICkge1xuXHRcdFx0XHRpZiAoIHN0YWNrICkge1xuXHRcdFx0XHRcdGlmICggc3RhY2subGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0ZmlyZSggc3RhY2suc2hpZnQoKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmICggbWVtb3J5ICkge1xuXHRcdFx0XHRcdGxpc3QgPSBbXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzZWxmLmRpc2FibGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Ly8gQWN0dWFsIENhbGxiYWNrcyBvYmplY3Rcblx0XHRzZWxmID0ge1xuXHRcdFx0Ly8gQWRkIGEgY2FsbGJhY2sgb3IgYSBjb2xsZWN0aW9uIG9mIGNhbGxiYWNrcyB0byB0aGUgbGlzdFxuXHRcdFx0YWRkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCBsaXN0ICkge1xuXHRcdFx0XHRcdC8vIEZpcnN0LCB3ZSBzYXZlIHRoZSBjdXJyZW50IGxlbmd0aFxuXHRcdFx0XHRcdHZhciBzdGFydCA9IGxpc3QubGVuZ3RoO1xuXHRcdFx0XHRcdChmdW5jdGlvbiBhZGQoIGFyZ3MgKSB7XG5cdFx0XHRcdFx0XHRqUXVlcnkuZWFjaCggYXJncywgZnVuY3Rpb24oIF8sIGFyZyApIHtcblx0XHRcdFx0XHRcdFx0dmFyIHR5cGUgPSBqUXVlcnkudHlwZSggYXJnICk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZSA9PT0gXCJmdW5jdGlvblwiICkge1xuXHRcdFx0XHRcdFx0XHRcdGlmICggIW9wdGlvbnMudW5pcXVlIHx8ICFzZWxmLmhhcyggYXJnICkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRsaXN0LnB1c2goIGFyZyApO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICggYXJnICYmIGFyZy5sZW5ndGggJiYgdHlwZSAhPT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBJbnNwZWN0IHJlY3Vyc2l2ZWx5XG5cdFx0XHRcdFx0XHRcdFx0YWRkKCBhcmcgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSkoIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRcdC8vIERvIHdlIG5lZWQgdG8gYWRkIHRoZSBjYWxsYmFja3MgdG8gdGhlXG5cdFx0XHRcdFx0Ly8gY3VycmVudCBmaXJpbmcgYmF0Y2g/XG5cdFx0XHRcdFx0aWYgKCBmaXJpbmcgKSB7XG5cdFx0XHRcdFx0XHRmaXJpbmdMZW5ndGggPSBsaXN0Lmxlbmd0aDtcblx0XHRcdFx0XHQvLyBXaXRoIG1lbW9yeSwgaWYgd2UncmUgbm90IGZpcmluZyB0aGVuXG5cdFx0XHRcdFx0Ly8gd2Ugc2hvdWxkIGNhbGwgcmlnaHQgYXdheVxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoIG1lbW9yeSApIHtcblx0XHRcdFx0XHRcdGZpcmluZ1N0YXJ0ID0gc3RhcnQ7XG5cdFx0XHRcdFx0XHRmaXJlKCBtZW1vcnkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gUmVtb3ZlIGEgY2FsbGJhY2sgZnJvbSB0aGUgbGlzdFxuXHRcdFx0cmVtb3ZlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCBsaXN0ICkge1xuXHRcdFx0XHRcdGpRdWVyeS5lYWNoKCBhcmd1bWVudHMsIGZ1bmN0aW9uKCBfLCBhcmcgKSB7XG5cdFx0XHRcdFx0XHR2YXIgaW5kZXg7XG5cdFx0XHRcdFx0XHR3aGlsZSggKCBpbmRleCA9IGpRdWVyeS5pbkFycmF5KCBhcmcsIGxpc3QsIGluZGV4ICkgKSA+IC0xICkge1xuXHRcdFx0XHRcdFx0XHRsaXN0LnNwbGljZSggaW5kZXgsIDEgKTtcblx0XHRcdFx0XHRcdFx0Ly8gSGFuZGxlIGZpcmluZyBpbmRleGVzXG5cdFx0XHRcdFx0XHRcdGlmICggZmlyaW5nICkge1xuXHRcdFx0XHRcdFx0XHRcdGlmICggaW5kZXggPD0gZmlyaW5nTGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZmlyaW5nTGVuZ3RoLS07XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGlmICggaW5kZXggPD0gZmlyaW5nSW5kZXggKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaXJpbmdJbmRleC0tO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIENvbnRyb2wgaWYgYSBnaXZlbiBjYWxsYmFjayBpcyBpbiB0aGUgbGlzdFxuXHRcdFx0aGFzOiBmdW5jdGlvbiggZm4gKSB7XG5cdFx0XHRcdHJldHVybiBqUXVlcnkuaW5BcnJheSggZm4sIGxpc3QgKSA+IC0xO1xuXHRcdFx0fSxcblx0XHRcdC8vIFJlbW92ZSBhbGwgY2FsbGJhY2tzIGZyb20gdGhlIGxpc3Rcblx0XHRcdGVtcHR5OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0bGlzdCA9IFtdO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBIYXZlIHRoZSBsaXN0IGRvIG5vdGhpbmcgYW55bW9yZVxuXHRcdFx0ZGlzYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGxpc3QgPSBzdGFjayA9IG1lbW9yeSA9IHVuZGVmaW5lZDtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gSXMgaXQgZGlzYWJsZWQ/XG5cdFx0XHRkaXNhYmxlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAhbGlzdDtcblx0XHRcdH0sXG5cdFx0XHQvLyBMb2NrIHRoZSBsaXN0IGluIGl0cyBjdXJyZW50IHN0YXRlXG5cdFx0XHRsb2NrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0c3RhY2sgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdGlmICggIW1lbW9yeSApIHtcblx0XHRcdFx0XHRzZWxmLmRpc2FibGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBJcyBpdCBsb2NrZWQ/XG5cdFx0XHRsb2NrZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gIXN0YWNrO1xuXHRcdFx0fSxcblx0XHRcdC8vIENhbGwgYWxsIGNhbGxiYWNrcyB3aXRoIHRoZSBnaXZlbiBjb250ZXh0IGFuZCBhcmd1bWVudHNcblx0XHRcdGZpcmVXaXRoOiBmdW5jdGlvbiggY29udGV4dCwgYXJncyApIHtcblx0XHRcdFx0YXJncyA9IGFyZ3MgfHwgW107XG5cdFx0XHRcdGFyZ3MgPSBbIGNvbnRleHQsIGFyZ3Muc2xpY2UgPyBhcmdzLnNsaWNlKCkgOiBhcmdzIF07XG5cdFx0XHRcdGlmICggbGlzdCAmJiAoICFmaXJlZCB8fCBzdGFjayApICkge1xuXHRcdFx0XHRcdGlmICggZmlyaW5nICkge1xuXHRcdFx0XHRcdFx0c3RhY2sucHVzaCggYXJncyApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRmaXJlKCBhcmdzICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIENhbGwgYWxsIHRoZSBjYWxsYmFja3Mgd2l0aCB0aGUgZ2l2ZW4gYXJndW1lbnRzXG5cdFx0XHRmaXJlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi5maXJlV2l0aCggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIFRvIGtub3cgaWYgdGhlIGNhbGxiYWNrcyBoYXZlIGFscmVhZHkgYmVlbiBjYWxsZWQgYXQgbGVhc3Qgb25jZVxuXHRcdFx0ZmlyZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gISFmaXJlZDtcblx0XHRcdH1cblx0XHR9O1xuXG5cdHJldHVybiBzZWxmO1xufTtcblxuIiwiLyoqXG4qIGpRdWVyeSBjb3JlIG9iamVjdC5cbipcbiogV29ya2VyIHdpdGggalF1ZXJ5IGRlZmVycmVkXG4qXG4qIENvZGUgZnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvYmxvYi9tYXN0ZXIvc3JjL2NvcmUuanNcbipcbiovXG5cbnZhciBqUXVlcnkgPSBtb2R1bGUuZXhwb3J0cyA9IHtcblx0dHlwZTogdHlwZVxuXHQsIGlzQXJyYXk6IGlzQXJyYXlcblx0LCBpc0Z1bmN0aW9uOiBpc0Z1bmN0aW9uXG5cdCwgaXNQbGFpbk9iamVjdDogaXNQbGFpbk9iamVjdFxuXHQsIGVhY2g6IGVhY2hcblx0LCBleHRlbmQ6IGV4dGVuZFxuXHQsIG5vb3A6IGZ1bmN0aW9uKCkge31cbn07XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbnZhciBjbGFzczJ0eXBlID0ge307XG4vLyBQb3B1bGF0ZSB0aGUgY2xhc3MydHlwZSBtYXBcblwiQm9vbGVhbiBOdW1iZXIgU3RyaW5nIEZ1bmN0aW9uIEFycmF5IERhdGUgUmVnRXhwIE9iamVjdFwiLnNwbGl0KFwiIFwiKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcblx0Y2xhc3MydHlwZVsgXCJbb2JqZWN0IFwiICsgbmFtZSArIFwiXVwiIF0gPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG59KTtcblxuXG5mdW5jdGlvbiB0eXBlKCBvYmogKSB7XG5cdHJldHVybiBvYmogPT0gbnVsbCA/XG5cdFx0U3RyaW5nKCBvYmogKSA6XG5cdFx0XHRjbGFzczJ0eXBlWyB0b1N0cmluZy5jYWxsKG9iaikgXSB8fCBcIm9iamVjdFwiO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKCBvYmogKSB7XG5cdHJldHVybiBqUXVlcnkudHlwZShvYmopID09PSBcImZ1bmN0aW9uXCI7XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkoIG9iaiApIHtcblx0cmV0dXJuIGpRdWVyeS50eXBlKG9iaikgPT09IFwiYXJyYXlcIjtcbn1cblxuZnVuY3Rpb24gZWFjaCggb2JqZWN0LCBjYWxsYmFjaywgYXJncyApIHtcblx0dmFyIG5hbWUsIGkgPSAwLFxuXHRsZW5ndGggPSBvYmplY3QubGVuZ3RoLFxuXHRpc09iaiA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGlzRnVuY3Rpb24oIG9iamVjdCApO1xuXG5cdGlmICggYXJncyApIHtcblx0XHRpZiAoIGlzT2JqICkge1xuXHRcdFx0Zm9yICggbmFtZSBpbiBvYmplY3QgKSB7XG5cdFx0XHRcdGlmICggY2FsbGJhY2suYXBwbHkoIG9iamVjdFsgbmFtZSBdLCBhcmdzICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZvciAoIDsgaSA8IGxlbmd0aDsgKSB7XG5cdFx0XHRcdGlmICggY2FsbGJhY2suYXBwbHkoIG9iamVjdFsgaSsrIF0sIGFyZ3MgKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBBIHNwZWNpYWwsIGZhc3QsIGNhc2UgZm9yIHRoZSBtb3N0IGNvbW1vbiB1c2Ugb2YgZWFjaFxuXHR9IGVsc2Uge1xuXHRcdGlmICggaXNPYmogKSB7XG5cdFx0XHRmb3IgKCBuYW1lIGluIG9iamVjdCApIHtcblx0XHRcdFx0aWYgKCBjYWxsYmFjay5jYWxsKCBvYmplY3RbIG5hbWUgXSwgbmFtZSwgb2JqZWN0WyBuYW1lIF0gKSA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Zm9yICggOyBpIDwgbGVuZ3RoOyApIHtcblx0XHRcdFx0aWYgKCBjYWxsYmFjay5jYWxsKCBvYmplY3RbIGkgXSwgaSwgb2JqZWN0WyBpKysgXSApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBvYmplY3Q7XG59XG5cbmZ1bmN0aW9uIGlzUGxhaW5PYmplY3QoIG9iaiApIHtcblx0Ly8gTXVzdCBiZSBhbiBPYmplY3QuXG5cdGlmICggIW9iaiB8fCBqUXVlcnkudHlwZShvYmopICE9PSBcIm9iamVjdFwiICkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHR2YXIgb3B0aW9ucywgbmFtZSwgc3JjLCBjb3B5LCBjb3B5SXNBcnJheSwgY2xvbmUsXG5cdHRhcmdldCA9IGFyZ3VtZW50c1swXSB8fCB7fSxcblx0aSA9IDEsXG5cdGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdGRlZXAgPSBmYWxzZTtcblxuXHQvLyBIYW5kbGUgYSBkZWVwIGNvcHkgc2l0dWF0aW9uXG5cdGlmICggdHlwZW9mIHRhcmdldCA9PT0gXCJib29sZWFuXCIgKSB7XG5cdFx0ZGVlcCA9IHRhcmdldDtcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMV0gfHwge307XG5cdFx0Ly8gc2tpcCB0aGUgYm9vbGVhbiBhbmQgdGhlIHRhcmdldFxuXHRcdGkgPSAyO1xuXHR9XG5cblx0Ly8gSGFuZGxlIGNhc2Ugd2hlbiB0YXJnZXQgaXMgYSBzdHJpbmcgb3Igc29tZXRoaW5nIChwb3NzaWJsZSBpbiBkZWVwIGNvcHkpXG5cdGlmICggdHlwZW9mIHRhcmdldCAhPT0gXCJvYmplY3RcIiAmJiAhalF1ZXJ5LmlzRnVuY3Rpb24odGFyZ2V0KSApIHtcblx0XHR0YXJnZXQgPSB7fTtcblx0fVxuXG5cdC8vIGV4dGVuZCBqUXVlcnkgaXRzZWxmIGlmIG9ubHkgb25lIGFyZ3VtZW50IGlzIHBhc3NlZFxuXHRpZiAoIGxlbmd0aCA9PT0gaSApIHtcblx0XHR0YXJnZXQgPSB0aGlzO1xuXHRcdC0taTtcblx0fVxuXG5cdGZvciAoIDsgaSA8IGxlbmd0aDsgaSsrICkge1xuXHRcdC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcblx0XHRpZiAoIChvcHRpb25zID0gYXJndW1lbnRzWyBpIF0pICE9IG51bGwgKSB7XG5cdFx0XHQvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG5cdFx0XHRmb3IgKCBuYW1lIGluIG9wdGlvbnMgKSB7XG5cdFx0XHRcdHNyYyA9IHRhcmdldFsgbmFtZSBdO1xuXHRcdFx0XHRjb3B5ID0gb3B0aW9uc1sgbmFtZSBdO1xuXG5cdFx0XHRcdC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3Bcblx0XHRcdFx0aWYgKCB0YXJnZXQgPT09IGNvcHkgKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZWN1cnNlIGlmIHdlJ3JlIG1lcmdpbmcgcGxhaW4gb2JqZWN0cyBvciBhcnJheXNcblx0XHRcdFx0aWYgKCBkZWVwICYmIGNvcHkgJiYgKCBqUXVlcnkuaXNQbGFpbk9iamVjdChjb3B5KSB8fCAoY29weUlzQXJyYXkgPSBqUXVlcnkuaXNBcnJheShjb3B5KSkgKSApIHtcblx0XHRcdFx0XHRpZiAoIGNvcHlJc0FycmF5ICkge1xuXHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIGpRdWVyeS5pc0FycmF5KHNyYykgPyBzcmMgOiBbXTtcblxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBqUXVlcnkuaXNQbGFpbk9iamVjdChzcmMpID8gc3JjIDoge307XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG5cdFx0XHRcdFx0dGFyZ2V0WyBuYW1lIF0gPSBqUXVlcnkuZXh0ZW5kKCBkZWVwLCBjbG9uZSwgY29weSApO1xuXG5cdFx0XHRcdFx0Ly8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBjb3B5ICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdFx0dGFyZ2V0WyBuYW1lIF0gPSBjb3B5O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3Rcblx0cmV0dXJuIHRhcmdldDtcbn07XG5cblxuIiwiXG4vKiFcbioganF1ZXJ5LWRlZmVycmVkXG4qIENvcHlyaWdodChjKSAyMDExIEhpZGRlbiA8enpkaGlkZGVuQGdtYWlsLmNvbT5cbiogTUlUIExpY2Vuc2VkXG4qL1xuXG4vKipcbiogTGlicmFyeSB2ZXJzaW9uLlxuKi9cblxudmFyIGpRdWVyeSA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vanF1ZXJ5LWNhbGxiYWNrcy5qc1wiKSxcblx0Y29yZV9zbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLyoqXG4qIGpRdWVyeSBkZWZlcnJlZFxuKlxuKiBDb2RlIGZyb206IGh0dHBzOi8vZ2l0aHViLmNvbS9qcXVlcnkvanF1ZXJ5L2Jsb2IvbWFzdGVyL3NyYy9kZWZlcnJlZC5qc1xuKiBEb2M6IGh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS9jYXRlZ29yeS9kZWZlcnJlZC1vYmplY3QvXG4qXG4qL1xuXG5qUXVlcnkuZXh0ZW5kKHtcblxuXHREZWZlcnJlZDogZnVuY3Rpb24oIGZ1bmMgKSB7XG5cdFx0dmFyIHR1cGxlcyA9IFtcblx0XHRcdFx0Ly8gYWN0aW9uLCBhZGQgbGlzdGVuZXIsIGxpc3RlbmVyIGxpc3QsIGZpbmFsIHN0YXRlXG5cdFx0XHRcdFsgXCJyZXNvbHZlXCIsIFwiZG9uZVwiLCBqUXVlcnkuQ2FsbGJhY2tzKFwib25jZSBtZW1vcnlcIiksIFwicmVzb2x2ZWRcIiBdLFxuXHRcdFx0XHRbIFwicmVqZWN0XCIsIFwiZmFpbFwiLCBqUXVlcnkuQ2FsbGJhY2tzKFwib25jZSBtZW1vcnlcIiksIFwicmVqZWN0ZWRcIiBdLFxuXHRcdFx0XHRbIFwibm90aWZ5XCIsIFwicHJvZ3Jlc3NcIiwgalF1ZXJ5LkNhbGxiYWNrcyhcIm1lbW9yeVwiKSBdXG5cdFx0XHRdLFxuXHRcdFx0c3RhdGUgPSBcInBlbmRpbmdcIixcblx0XHRcdHByb21pc2UgPSB7XG5cdFx0XHRcdHN0YXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gc3RhdGU7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGFsd2F5czogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZGVmZXJyZWQuZG9uZSggYXJndW1lbnRzICkuZmFpbCggYXJndW1lbnRzICk7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRoZW46IGZ1bmN0aW9uKCAvKiBmbkRvbmUsIGZuRmFpbCwgZm5Qcm9ncmVzcyAqLyApIHtcblx0XHRcdFx0XHR2YXIgZm5zID0gYXJndW1lbnRzO1xuXHRcdFx0XHRcdHJldHVybiBqUXVlcnkuRGVmZXJyZWQoZnVuY3Rpb24oIG5ld0RlZmVyICkge1xuXHRcdFx0XHRcdFx0alF1ZXJ5LmVhY2goIHR1cGxlcywgZnVuY3Rpb24oIGksIHR1cGxlICkge1xuXHRcdFx0XHRcdFx0XHR2YXIgYWN0aW9uID0gdHVwbGVbIDAgXSxcblx0XHRcdFx0XHRcdFx0XHRmbiA9IGZuc1sgaSBdO1xuXHRcdFx0XHRcdFx0XHQvLyBkZWZlcnJlZFsgZG9uZSB8IGZhaWwgfCBwcm9ncmVzcyBdIGZvciBmb3J3YXJkaW5nIGFjdGlvbnMgdG8gbmV3RGVmZXJcblx0XHRcdFx0XHRcdFx0ZGVmZXJyZWRbIHR1cGxlWzFdIF0oIGpRdWVyeS5pc0Z1bmN0aW9uKCBmbiApID9cblx0XHRcdFx0XHRcdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciByZXR1cm5lZCA9IGZuLmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHRcdFx0XHRcdFx0XHRcdGlmICggcmV0dXJuZWQgJiYgalF1ZXJ5LmlzRnVuY3Rpb24oIHJldHVybmVkLnByb21pc2UgKSApIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuZWQucHJvbWlzZSgpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LmRvbmUoIG5ld0RlZmVyLnJlc29sdmUgKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC5mYWlsKCBuZXdEZWZlci5yZWplY3QgKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC5wcm9ncmVzcyggbmV3RGVmZXIubm90aWZ5ICk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRuZXdEZWZlclsgYWN0aW9uICsgXCJXaXRoXCIgXSggdGhpcyA9PT0gZGVmZXJyZWQgPyBuZXdEZWZlciA6IHRoaXMsIFsgcmV0dXJuZWQgXSApO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0gOlxuXHRcdFx0XHRcdFx0XHRcdG5ld0RlZmVyWyBhY3Rpb24gXVxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRmbnMgPSBudWxsO1xuXHRcdFx0XHRcdH0pLnByb21pc2UoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Ly8gR2V0IGEgcHJvbWlzZSBmb3IgdGhpcyBkZWZlcnJlZFxuXHRcdFx0XHQvLyBJZiBvYmogaXMgcHJvdmlkZWQsIHRoZSBwcm9taXNlIGFzcGVjdCBpcyBhZGRlZCB0byB0aGUgb2JqZWN0XG5cdFx0XHRcdHByb21pc2U6IGZ1bmN0aW9uKCBvYmogKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG9iaiAhPSBudWxsID8galF1ZXJ5LmV4dGVuZCggb2JqLCBwcm9taXNlICkgOiBwcm9taXNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZGVmZXJyZWQgPSB7fTtcblxuXHRcdC8vIEtlZXAgcGlwZSBmb3IgYmFjay1jb21wYXRcblx0XHRwcm9taXNlLnBpcGUgPSBwcm9taXNlLnRoZW47XG5cblx0XHQvLyBBZGQgbGlzdC1zcGVjaWZpYyBtZXRob2RzXG5cdFx0alF1ZXJ5LmVhY2goIHR1cGxlcywgZnVuY3Rpb24oIGksIHR1cGxlICkge1xuXHRcdFx0dmFyIGxpc3QgPSB0dXBsZVsgMiBdLFxuXHRcdFx0XHRzdGF0ZVN0cmluZyA9IHR1cGxlWyAzIF07XG5cblx0XHRcdC8vIHByb21pc2VbIGRvbmUgfCBmYWlsIHwgcHJvZ3Jlc3MgXSA9IGxpc3QuYWRkXG5cdFx0XHRwcm9taXNlWyB0dXBsZVsxXSBdID0gbGlzdC5hZGQ7XG5cblx0XHRcdC8vIEhhbmRsZSBzdGF0ZVxuXHRcdFx0aWYgKCBzdGF0ZVN0cmluZyApIHtcblx0XHRcdFx0bGlzdC5hZGQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly8gc3RhdGUgPSBbIHJlc29sdmVkIHwgcmVqZWN0ZWQgXVxuXHRcdFx0XHRcdHN0YXRlID0gc3RhdGVTdHJpbmc7XG5cblx0XHRcdFx0Ly8gWyByZWplY3RfbGlzdCB8IHJlc29sdmVfbGlzdCBdLmRpc2FibGU7IHByb2dyZXNzX2xpc3QubG9ja1xuXHRcdFx0XHR9LCB0dXBsZXNbIGkgXiAxIF1bIDIgXS5kaXNhYmxlLCB0dXBsZXNbIDIgXVsgMiBdLmxvY2sgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gZGVmZXJyZWRbIHJlc29sdmUgfCByZWplY3QgfCBub3RpZnkgXSA9IGxpc3QuZmlyZVxuXHRcdFx0ZGVmZXJyZWRbIHR1cGxlWzBdIF0gPSBsaXN0LmZpcmU7XG5cdFx0XHRkZWZlcnJlZFsgdHVwbGVbMF0gKyBcIldpdGhcIiBdID0gbGlzdC5maXJlV2l0aDtcblx0XHR9KTtcblxuXHRcdC8vIE1ha2UgdGhlIGRlZmVycmVkIGEgcHJvbWlzZVxuXHRcdHByb21pc2UucHJvbWlzZSggZGVmZXJyZWQgKTtcblxuXHRcdC8vIENhbGwgZ2l2ZW4gZnVuYyBpZiBhbnlcblx0XHRpZiAoIGZ1bmMgKSB7XG5cdFx0XHRmdW5jLmNhbGwoIGRlZmVycmVkLCBkZWZlcnJlZCApO1xuXHRcdH1cblxuXHRcdC8vIEFsbCBkb25lIVxuXHRcdHJldHVybiBkZWZlcnJlZDtcblx0fSxcblxuXHQvLyBEZWZlcnJlZCBoZWxwZXJcblx0d2hlbjogZnVuY3Rpb24oIHN1Ym9yZGluYXRlIC8qICwgLi4uLCBzdWJvcmRpbmF0ZU4gKi8gKSB7XG5cdFx0dmFyIGkgPSAwLFxuXHRcdFx0cmVzb2x2ZVZhbHVlcyA9IGNvcmVfc2xpY2UuY2FsbCggYXJndW1lbnRzICksXG5cdFx0XHRsZW5ndGggPSByZXNvbHZlVmFsdWVzLmxlbmd0aCxcblxuXHRcdFx0Ly8gdGhlIGNvdW50IG9mIHVuY29tcGxldGVkIHN1Ym9yZGluYXRlc1xuXHRcdFx0cmVtYWluaW5nID0gbGVuZ3RoICE9PSAxIHx8ICggc3Vib3JkaW5hdGUgJiYgalF1ZXJ5LmlzRnVuY3Rpb24oIHN1Ym9yZGluYXRlLnByb21pc2UgKSApID8gbGVuZ3RoIDogMCxcblxuXHRcdFx0Ly8gdGhlIG1hc3RlciBEZWZlcnJlZC4gSWYgcmVzb2x2ZVZhbHVlcyBjb25zaXN0IG9mIG9ubHkgYSBzaW5nbGUgRGVmZXJyZWQsIGp1c3QgdXNlIHRoYXQuXG5cdFx0XHRkZWZlcnJlZCA9IHJlbWFpbmluZyA9PT0gMSA/IHN1Ym9yZGluYXRlIDogalF1ZXJ5LkRlZmVycmVkKCksXG5cblx0XHRcdC8vIFVwZGF0ZSBmdW5jdGlvbiBmb3IgYm90aCByZXNvbHZlIGFuZCBwcm9ncmVzcyB2YWx1ZXNcblx0XHRcdHVwZGF0ZUZ1bmMgPSBmdW5jdGlvbiggaSwgY29udGV4dHMsIHZhbHVlcyApIHtcblx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCB2YWx1ZSApIHtcblx0XHRcdFx0XHRjb250ZXh0c1sgaSBdID0gdGhpcztcblx0XHRcdFx0XHR2YWx1ZXNbIGkgXSA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gY29yZV9zbGljZS5jYWxsKCBhcmd1bWVudHMgKSA6IHZhbHVlO1xuXHRcdFx0XHRcdGlmKCB2YWx1ZXMgPT09IHByb2dyZXNzVmFsdWVzICkge1xuXHRcdFx0XHRcdFx0ZGVmZXJyZWQubm90aWZ5V2l0aCggY29udGV4dHMsIHZhbHVlcyApO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICEoIC0tcmVtYWluaW5nICkgKSB7XG5cdFx0XHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlV2l0aCggY29udGV4dHMsIHZhbHVlcyApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdH0sXG5cblx0XHRcdHByb2dyZXNzVmFsdWVzLCBwcm9ncmVzc0NvbnRleHRzLCByZXNvbHZlQ29udGV4dHM7XG5cblx0XHQvLyBhZGQgbGlzdGVuZXJzIHRvIERlZmVycmVkIHN1Ym9yZGluYXRlczsgdHJlYXQgb3RoZXJzIGFzIHJlc29sdmVkXG5cdFx0aWYgKCBsZW5ndGggPiAxICkge1xuXHRcdFx0cHJvZ3Jlc3NWYWx1ZXMgPSBuZXcgQXJyYXkoIGxlbmd0aCApO1xuXHRcdFx0cHJvZ3Jlc3NDb250ZXh0cyA9IG5ldyBBcnJheSggbGVuZ3RoICk7XG5cdFx0XHRyZXNvbHZlQ29udGV4dHMgPSBuZXcgQXJyYXkoIGxlbmd0aCApO1xuXHRcdFx0Zm9yICggOyBpIDwgbGVuZ3RoOyBpKysgKSB7XG5cdFx0XHRcdGlmICggcmVzb2x2ZVZhbHVlc1sgaSBdICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCByZXNvbHZlVmFsdWVzWyBpIF0ucHJvbWlzZSApICkge1xuXHRcdFx0XHRcdHJlc29sdmVWYWx1ZXNbIGkgXS5wcm9taXNlKClcblx0XHRcdFx0XHRcdC5kb25lKCB1cGRhdGVGdW5jKCBpLCByZXNvbHZlQ29udGV4dHMsIHJlc29sdmVWYWx1ZXMgKSApXG5cdFx0XHRcdFx0XHQuZmFpbCggZGVmZXJyZWQucmVqZWN0IClcblx0XHRcdFx0XHRcdC5wcm9ncmVzcyggdXBkYXRlRnVuYyggaSwgcHJvZ3Jlc3NDb250ZXh0cywgcHJvZ3Jlc3NWYWx1ZXMgKSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC0tcmVtYWluaW5nO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gaWYgd2UncmUgbm90IHdhaXRpbmcgb24gYW55dGhpbmcsIHJlc29sdmUgdGhlIG1hc3RlclxuXHRcdGlmICggIXJlbWFpbmluZyApIHtcblx0XHRcdGRlZmVycmVkLnJlc29sdmVXaXRoKCByZXNvbHZlQ29udGV4dHMsIHJlc29sdmVWYWx1ZXMgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xuXHR9XG59KTtcbiJdfQ==
