/**
 * This module is responsible for utils.
 *
 * @param array | dependencies
 * @param function | callback
 */

"use strict";

define(['require', 'jquery', 'utils'], function(require, $, _){

    // A SIAF, with the window and document object aliased.
    return (function(w, d){    
        var self;
        return {
            app: {},
            filters: {
                'album_caption': [],
            },
            /**
             * A method to extend an object with the Backbone.Events framework, providing methods to attaching and triggering custom events.
             * @param object | object
             * @return object
             */
            init: function(app, callback){
                self = this;
                self.app = app;
                var deferred = new $.Deferred();
                deferred.done(callback);
                deferred.resolve();
                return deferred;
            },
            create: function(){
                // Create the filters (determine values).
                self.createFilters();
                // Render the UI elements for the filters.
                self.render();
                // Attach the event handlers.
                self.attachEvents();
            },
            createFilters: function(){
                var collection = self.app.fetch();              
                for(var i in collection){
                    var node = collection[i].get('node');
                    for(var j in self.filters){
                        if(node[j]
                            && self.filters[j].indexOf(node[j]) < 0){
                            // Add the value to relevant filter.
                            self.filters[j].push(node[j]);
                        }
                    }
                }
            },
            render: function(){
                var container = self.app.container;
                container.find('#filters > .wrapper').append(function(){
                    var output = '';
                    $.each(self.filters, function(i, v){
                        v.sort();
                        output += '<select name="' + i + '">';
                        output += '<option name="none">None</option>';
                        $.each(v, function(i1, v1){
                            output += '<option value="' + v1 + '">' + v1 + '</option>';
                        });
                        output += '</select>';
                    });
                    return output;
                });
            },
            attachEvents: function(){
                var container = self.app.container;
                container.find('#filters > .wrapper > select').on('change', self.app.filter);
            },
        };
    })(window, document);

});