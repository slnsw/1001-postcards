/**
 * This module is responsible for extras.
 *
 * @param array | dependencies
 * @param function | callback
 */

"use strict";

define(['require', 'jquery', 'backbone', 'underscore', 'utils'], function(require, $, Backbone, _, utils){

    // A SIAF, with the window and document object aliased.
    return (function(w, d){    
        var self;
        // Define the model and collection. A view is not needed in this instance as that will be handled by three.js, and referenceable from the object property.
        var Model = Backbone.Model.extend({
            defaults: {
                id: '',
                node: {},
                mesh: {},
            },
        });
        var Collection = Backbone.Collection.extend({
            model: Model,
            initialize: function(){
            },
        });
        return {
            app: {},
            collection: {},
            /**
             * A method to extend an object with the Backbone.Events framework, providing methods to attaching and triggering custom events.
             * @param object | object
             * @return object
             */
            init: function(app, callback){
                self = this;
                self.app = app;
                var deferred = new $.Deferred();
                // Create a new collection for images to be added.
                self.collection = new Collection(null, { context: self });
                deferred.done(callback);
                deferred.resolve();
                return deferred;
            },
            save: function(mesh, node){
                // Add the image to the collection.
                self.collection.add({
                    id: mesh.uuid,
                    node: node,
                    mesh: mesh,
                }, {
                    merge: true,
                });
            },
            fetch: function(params){
                var collection = self.collection.models,
                filtered = {};
                if(params){
                    collection = _.filter(collection, function(model){ 
                        return (typeof _.where([model.get('node')], params)[0] !== 'undefined' ? true : false);
                    });
                }
                return (collection.length > 0 ? collection : false);
            },
        };
    })(window, document);
});