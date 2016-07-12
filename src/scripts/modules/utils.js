/**
 * This module is responsible for utils.
 *
 * @param array | dependencies
 * @param function | callback
 */

"use strict";

define(['require', 'jquery', 'underscore', 'backbone'], function(require, $, _, Backbone){

    // A SIAF, with the window and document object aliased.
    return (function(w, d){    
        var self;
        return {
            app: {},
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
            shuffle: function(array){
                return _.shuffle(array);
            },
            clone: function(object){
                return _.clone(object);
            }, 
            getRandomInt: function(){
                return Math.floor((Math.random() * (100 - 1)) + 1);
            },
            attachBackboneEvents: function(object){
                _.extend(object, Backbone.Events);
            },
            isGreater: function(int1, int2){
                return (int1 > int2);
            },
            isLess: function(int1, int2){
                return (int1 < int2);
            },
            getMatrixValue: function(matrix, indexes){
                if(typeof indexes === 'number'){
                    indexes = [indexes];
                }
                if(matrix){
                    for(var i in matrix){
                        if(indexes[0] == i){                           
                            if(indexes.length == 1){
                                return matrix[i];
                            }else{
                                return self.getMatrixValue(matrix[i], indexes.slice(1));
                            }
                        }
                    }
                }
                return null;
            }
        };
    })(window, document);

});