/**
 * This module is responsible for loading and parsing XML data from a local source. The XML has to be in a specific format, strictly containing <item /> nodes. The properties (child nodes) of the item is not restricted, and are dynamically attached to the item when parsed.
 *
 * @param array | dependencies
 * @param function | callback
 */

"use strict";

define(['require', 'jquery', 'utils'], function(require, $){

    // A SIAF, with the window and document object aliased.
    return (function(w, d){    
        var self;
        return {
            app: {},
            // A property to store the results from each ajax request.
            result: [],
            // A property to store any errors from each ajax request.
            errors: [],
            /**
             * A method to fetch the XML using jQuery and inherently deferreds.
             * @param array | urls
             * @param array | options
             * @return object | this
             */
            init: function(urls, options, app, callback){
                self = this;
                self.app = app;
                // jQuery $.ajax options.
                var options = $.extend(options, {
                    context: self,
                    dataType: 'xml',
                    cache: false,
                });
                var deferred = new $.Deferred();
                deferred.done(callback);
                // A variable to store the deferred object for each XML request.
                var requests = [];
                for(var i = 0; i < urls.length; i++){
                    // A SIAF to capture the value of i. This is required when using a loop due to it's speed of execution.
                    (function(i){
                        requests[i] = $.Deferred(function(deferred){
                            $.ajax(urls[i], options)
                                .done(function(data){
                                    // If the ajax request is successful, parse the response and push it onto the results stack.
                                    this.result[i] = this.parse(data);
                                    // Mark the deferred as successful.
                                    deferred.resolve();
                                })
                                .fail(function(){
                                    // If the ajax request fails, log the error.
                                    this.errors.push('error');
                                    // Mark the deferred as failed.
                                    deferred.reject();
                                });
                            }).promise();
                    })(i);
                }
                // Once all the deferred objects are marked as successful, trigger the custom event xmlReady.
                $.when.apply(self, requests).done($.proxy(function(){
                    deferred.resolve();
                }, self));
                return deferred;
            },
            /**
             * A method to parse the XML response from the ajax request. The method target's 'item' nodes and it's child nodes, storing each node as an associative array under each requests own index.
             * @param object | item
             * @return array | result
             */
            parse: function(data){
                // Convert the response to a jQuery object in order to utilise jQuery's method's to provide ease of accesibility and transversal.
                var nodes = $(data).find('node');
                // A variable to store the nodes, each as an associative array.
                var result = [];
                if(nodes.length > 0){
                    $.each(nodes, function(i, node){
                        // Create a new object to store the result.
                        result[i] = {};
                        // Reset the node's index length. Associative array's length in JS is undefined. It is only maintained with numerical indexes.
                        var length = 0;
                        $.each($(node).children(), function(i1, property){
                            // Convert the property to a jQuery object.
                            var property = $(property);
                            // Get the textual value.
                            var value = property.html();
                            // Store the property as a key - value pair under the item in the resulting array.
                            result[i][property.prop('tagName')] = (value ? value : '');
                            // Maintain the associative array length.
                            length++;                             
                        });
                        // Manually set the associative array length.
                        result[i].length = length;          
                    });
                }
                // Return the resulting array of nodes.
                return result;
            }
        };
    })(window, document);

});