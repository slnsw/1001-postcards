
/**
 * This module is the application itself, it utilises sub-modules, each of which perform their own init process to perform instantiation and assignation of objects back to the application.
 */

"use strict";

define(['require', 'jquery', 'fetch', 'utils', 'world', 'ui', 'store'], function(require, $, fetch, utils, world, ui, store){ 
    // SIAF with the window and document aliased.
    (function(w, d){        
        var self;
        return {
            // The XML file(s), the output of each XML file is stored within the output property.
            xml: {
                input: ['./dist/data/set1.xml'],
                output: [],
            },
            // The cached filters and meshes that have been applied through use of the UI.
            cached: {
                filters: {},
                meshes: {},
            },
            container: $('#container'),
            // The init method.
            init: function(){
                // A self referencing variable.
                self = this;
                utils.attachBackboneEvents(self);
                // An array to store the deferreds relative to each module.  
                var deferreds = [];  
                deferreds.push(fetch.init(self.xml.input, {}, self, $.proxy(function(){
                  self.xml.output = fetch.result[0];
                }, self)));
                deferreds.push(utils.init(self));
                deferreds.push(world.init(self));
                deferreds.push(ui.init(self));                
                deferreds.push(store.init(self));
                // Once all the modules have been loaded, the app is rendered.
                $.when.apply(self, deferreds).done(function(){
                    self.pre().render();
                });
                // Reset the deferreds array.
                deferreds = [];
            },
            // A method pre-render.
            pre: function(){
                world.create();               
                return self;
            },
            // A method for rendering the app.            
            render: function(){
                return self;
            },
            // A method post-render.            
            post: function(){
                ui.create();
                world.render();                
                return self;
            },
            // A method for storing a composition of the node and it's mesh within the world.            
            store: function(mesh, node){
                store.save(mesh, node);
            },
            // A method for fetching the collection, with or without params applied.            
            fetch: function(params){
                return store.fetch(params);
            },
            // A method for caching, based on a key and value.            
            cache: function(key, value){
                if(value){
                    self.cache[key] = value;
                }
                return self.cache[key];
            },
            // A method triggered when a filter has been applied through the UI.            
            filter: function(event){
                // 'this' is relative to the element that triggered the filter - dom element. 
                var el = $(this);
                var value = [];
                value[el.attr('name')] = el.val();              
                var params = self.cache('filters', value);
                world.filter(params);
            },          
            // A method triggered when a mesh has been selected within the world.             
            toggle: function(event){
                var mesh = event.target;
                // 'this' is relative to the element that has been clicked - mesh.
                world.toggle(mesh);
            },
            alert: function(message){
                alert(message);
            },
        // Initialise the app immediately.                                                            
        }.init();

    })(window, document);

});