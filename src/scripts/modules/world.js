/**
 * This module is responsible for world.
 *
 * @param array | dependencies
 * @param function | callback
 */

"use strict";

define(['require', 'jquery', 'utils', 'three', 'tween', 'base/libs/prod/events/threex.domevents', 'base/libs/dev/orbit/orbit'], function(require, $, utils, THREE, TweenLite){

    // A SIAF, with the window and document object aliased.
    return (function(w, d){    
        var self;
        return {
            app: {},
            scene: {},
            camera: {},
            renderer: {},
            light: {}, 
            events: {},    
            controls: {},
            settings: {
                fov: 75,
                aspect: 0,
                pw: 0,
                ph: 0,
                displacement: {
                    enabled: false,
                    x: 0.5,
                    z: 0.5,
                }, 
                interface: {
                    near: 0,                    
                    far: 0,
                },   
                frustrum: {
                    near: 1,
                    far: 500,
                }         
            },
            storage: {
                meshes: [],
            },
            container: $('#world'),
            /**
             * A method to extend an object with the Backbone.Events framework, providing methods to attaching and triggering custom events.
             * @param object | object
             * @return object
             */
            init: function(app, callback){
                self = this;
                utils.attachBackboneEvents(self);             
                self.app = app;
                self.container = self.app.container.find(self.container);
                self.listenTo(self, 'meshes:created', self.addMeshes);
                self.app.listenTo(self, 'meshes:added', self.app.post);                  
                var deferred = new $.Deferred();
                deferred.done(callback);
                self.settings.aspect = (w.innerWidth / (w.innerHeight * 0.90));
                // Create a new scene.
                var scene = self.scene = new THREE.Scene(); 
                // * For testing.
                // scene.add(new THREE.AxisHelper(100));
                // scene.add(new THREE.GridHelper(100, 1));                    
                // Create a new camera. The near frustrum plane is the nearest point at which objects are clipped from view, with the far frustum being the opposite. The world coordinate system starts from (0, 0, 0), the positive coordinates of the z-axis being nearest to the camera.
                var camera = self.camera = new THREE.PerspectiveCamera(self.settings.fov, self.settings.aspect, self.settings.frustrum.near, self.settings.frustrum.far);
                // Adjust the position of the camera.
                camera.position.set(0, 0, 20);      
                var light = self.light = new THREE.AmbientLight( 0xFFFFFF);
                scene.add(light);                
                var renderer = self.renderer = new THREE.WebGLRenderer({
                    devicePixelRatio: w.devicePixelRatio || 1,
                });                                             
                renderer.setSize(w.innerWidth, (w.innerHeight * 0.90)); 
                var events = self.events = new THREEx.DomEvents(self.camera, self.renderer.domElement);
                // * For testing.
                // var controls = self.controls = new THREE.OrbitControls(self.camera, self.renderer.domElement);
                self.settings.interface.near = (self.camera.position.z - 5);
                self.settings.interface.far = 2;             
                deferred.resolve();
                return deferred;
            },  
            render: function(){
                self.container.append(self.renderer.domElement);
                w.requestAnimationFrame(self.requestAnimationFrame);
            },
            requestAnimationFrame: function(timestamp){
                self.renderer.render(self.scene, self.camera);
                w.requestAnimationFrame(self.requestAnimationFrame);
            },
            create: function(){
                var dimensions = self.getPerspectiveDimensions(self.camera.position.z, self.settings.fov, self.settings.aspect);
                self.settings.pw = dimensions[0];
                self.settings.ph = dimensions[1];
                self.createMeshes();
            },
            createMeshes: function(){
                var xml = self.app.xml.output = utils.shuffle(self.app.xml.output);
                if(xml){
                    for(var i in xml){
                        self.createMesh(xml[i], (i == (xml.length - 1)));
                    }
                }
            },
            createMesh: function(node, last){  
                var image = d.createElement('img');
                var last = last || false;
                (function(node, image){                    
                    image.onload = function(){
                        var geometry,
                        material,
                        texture,
                        mesh;        
                        // Use the image width and height (scaled down to 1% of it's original dimensions) as the plane's geometry.
                        var w = image.width / 100;
                        var h = image.height / 100;
                        geometry = new THREE.PlaneGeometry(w, h, 1);   
                        texture = new THREE.Texture(image);               
                        material = new THREE.MeshLambertMaterial({
                            side: THREE.DoubleSide,
                            map: texture,
                        });
                        material.transparent = true;
                        material.opacity = 0.3;
                        mesh = new THREE.Mesh(geometry, material); 
                        texture.needsUpdate = true;                 
                        self.attachDOMEvents(mesh);
                        self.app.store(mesh, node);
                        self.storage.meshes.push(mesh);
                        // If this is the last mesh to be created, trigger the custom event 'meshes:created'.
                        if(last){
                            self.trigger('meshes:created');
                        }                 
                    }    
                    image.src = node['img_url'];                          
                })(node, image);
            },
            addMeshes: function(){
                // The stored meshes, post-creation.
                var meshes = self.storage.meshes;
                // The array to store a single row of meshes. The array is reset once the number of meshes exceeds the row length.
                var row = [];                
                // The array to store multiple rows that fit the viewport.
                var rows = [];
                // The array to store multiple grids (collection of rows) that fit the viewport.
                var grids = [];
                // The perpespective width of the viewport, reflective of the distance from the camera to the start of the first grid. The width is divided by 2 to reflect the + and - cartesian coordinate system. The subtraction of 4 is to provide buffer at the edges of the x axis.
                var pw = ((self.settings.pw / 2) - 4);
                // The perpespective height of the viewport, reflective of the distance from the camera to the start of the first grid. The height is divided by 2 to reflect the + and - cartesian coordinate system. The subtraction of 4 is to provide buffer at the edges of the y axis.           
                var ph = ((self.settings.ph / 2) - 4);
                // The starting x pos. -(pw) on the x axis.
                var sx = -(pw);
                // The ending x pos. +(pw) on the x axis.                
                var ex = (pw);
                // The starting y pos. -(ph) on the y axis.                
                var sy = -(ph);
                // The ending y pos. +(ph) on the x axis.                
                var ey = (ph);
                // The starting z pos. 0 on the z axis.                
                var sz = 0;
                // Initialise the x, y and z pos.            
                var x = sx;
                var y = sy;
                var z = sz;                
                if(meshes){
                    for(var i in meshes){
                        // The current mesh.
                        var mesh = meshes[i];
                        // The width and height of the current mesh, utilising the params defined for it's geometry.
                        var meshW = mesh.geometry.parameters.width;
                        var meshH = mesh.geometry.parameters.height;
                        // If the x pos plus the current mesh width extends beyond the perspective width bounds, perform a reset.
                        if(utils.isGreater((x + meshW), ex)){
                            // Reset x to the starting pos to the left of the viewport.
                            x = sx;
                            // Add the current row to rows.
                            rows.push(row);
                            // Clear the current row.
                            row = [];
                            if(utils.isGreater((y + meshH), ey)){
                                // Reset y to the starting pos, relative to the bottom of the viewport.
                                y = sy;
                                // Add the current collection of rows to the grid.
                                grids.push(rows);
                                // Clear the current collection of rows.
                                rows = [];
                                // Adjust the z pos to create a new grid.
                                z -= 2;
                            }
                        }
                        // The current mesh index in the row.
                        var meshIndex = (row.length);                        
                        // Get the previous mesh within the row.
                        var prevMeshIndex = (row.length - 1);
                        var prevMesh = utils.getMatrixValue(row, prevMeshIndex);
                        if(prevMesh){
                            var prevMeshW = prevMesh.geometry.parameters.width;
                            x += ((prevMeshW / 2) + (meshW / 2));
                        }
                        var prevRowIndex = (rows.length - 1);
                        var meshInPrevRow = utils.getMatrixValue(rows, [prevRowIndex, meshIndex]);
                        // If there is a mesh in the exact same position in the previous row, leverage it's y pos to calculate the y pos of the current mesh. This logic is used to reduce overlapping between meshes in different rows of the same index.
                        if(meshInPrevRow){
                            var meshInPrevRowH = meshInPrevRow.geometry.parameters.height;
                            var meshInPrevRowY = meshInPrevRow.position.y;
                            y = (meshInPrevRowY + ((meshInPrevRowH / 2) + (meshH / 2)));
                        }                       
                        mesh.position.x = x;
                        mesh.position.y = y;
                        mesh.position.z = z;       
                        // Determine whether to apply displacement to the current mesh using a random integer evenly divisible by 2.
                        if(self.settings.displacement.enabled){
                            if((utils.getRandomInt() % 2)){
                                mesh.position.x -= self.settings.displacement.x;
                                mesh.position.z -= self.settings.displacement.z;
                            }
                        }                                     
                        mesh.needsUpdate = true;                      
                        row.push(mesh);                                  
                    }
                    grids.push(rows);
                }
                // Add the grids, housing the rows and meshes to the scene.
                for(var i in grids){
                    for(var j in grids[i]){
                        for(var k in grids[i][j]){
                            self.scene.add(grids[i][j][k]);
                        }
                    }
                }
                // Once the grids have been added, trigger the custom event 'meshes:added'.
                self.trigger('meshes:added');
            },  
            /**
             * A method to calibrate potentially new coordinates for a mesh dependent upon whether it collides with another. The x and o (offset z) are adjusted if a collision does occur.
             * @param int | x
             * @param int | y
             * @param int | o (offset)
             * @param array | coords
             */
            calibrateCoords: function(x, y, o, coords, dimensions){
                // Ensure the x and y coords are within the viewable perspective bounds. Change the x and y pos if necessary and then check for overlapping.
                x = (x < -(dimensions[0] / 2) ? -(dimensions[0] / 2) : (x > (dimensions[0] / 2)) ? (dimensions[0] / 2) : x);
                y = (y < -(dimensions[1] / 2) ? -(dimensions[1] / 2) : (y > (dimensions[1] / 2)) ? (dimensions[1] / 2) : y);                
                // The space that the mesh occupies.
                var start = (x - self.settings.mw / 2);
                var end = (x + self.settings.mw / 2);
                for(var i in coords){
                    var keys = coords[i].split(':');
                    var x1 = parseFloat(keys[0]);
                    var y1 = parseFloat(keys[1]);
                    var o1 = parseFloat(keys[2]);
                    if((x1 + (self.settings.mw / 2)) >= start
                        && (x1 - (self.settings.mw / 2)) <= end
                            && y1 == y
                                && o1 == o){
                        // If a collision is apparent, adjust the x and o (offset) params by the defined displacement and call the method again to ensure it doesn't conflict further. 
                        return self.calibrateCoords((x + self.settings.displacement.x), y, (o + self.settings.displacement.z), coords, dimensions);
                    }
                }
                // Return the calibrated coordinates upon collision avoidance. This method may be triggered more than once dependent upon whether nested calls are made to this method.
                return x + ':' + y + ':' + o;
            },            
            filter: function(params){
                // Get the filtered collection, based on the input params.
                var collection = self.app.fetch(params);
                // Get the cached filtered collection, if applicable.
                var cached = self.app.cache('meshes');      
                // Deactivate cached.  
                for(var i in cached){
                    var mesh = cached[i].get('mesh');    
                    // The current cached mesh active state is determined by how close it is to the camera.
                    var active = (mesh.position.z === self.settings.interface.near ? true : false);
                    TweenLite.to([mesh.position, mesh.material], 1, { 
                        x: mesh.static.position.x,
                        y: mesh.static.position.y,
                        z: mesh.static.position.z,
                        opacity: 0.3 
                    });       
                    if(active){
                        self.overlay('', 0, 0, 0, true);
                    }                               
                }
                var coords = [];
                // If the collection is empty, display a simple alert.
                if(!collection){
                    self.app.alert('Unfortunately there aren\'t any images for the filter you have selected.');
                }
                // Activate filtered.                
                for(var j in collection){
                    var mesh = collection[j].get('mesh');
                    // Create a new property on the mesh object for static storage.
                    mesh.static = {};
                    // Logic to offset an image if it overlaps with another on the same x:y:z plane combination.
                    var x = mesh.position.x;
                    var y = mesh.position.y;
                    var z = mesh.position.z;
                    // Get the perspective dimensions for the filtered set pos on the z plane. This will be used to ensure each mesh is viewable within the perspective bounds.
                    var dimensions = self.getPerspectiveDimensions(self.settings.interface.near, self.settings.fov, self.settings.aspect);
                    // Get a unique key/coordinates for the mesh.
                    var key = self.calibrateCoords(x, y, 0, coords, dimensions);
                    // Add the key/coordinates to storage for iterative reference.
                    coords.push(key);
                    if(key){
                        // Explode the key string into an array.
                        var keys = key.split(':');
                        // Typecast the coordinates to floats.
                        var x1 = parseFloat(keys[0]);
                        var y1 = parseFloat(keys[1]);
                        var o = parseFloat(keys[2]);
                        // Store the mesh's original coordinates.                                         
                        mesh.static.position = {
                            x: x1,
                            y: y1,
                            z: z,
                        };          
                        // Define an offset if applicable, this will resolve to greater than 0 if the meshes overlap.
                        mesh.static.offset = o;
                        // * For testing.
                        // if(o > 0){
                        //     mesh.material.color = new THREE.Color(0xff0000);
                        //     mesh.material.needsUpdate = true;                            
                        // }
                        // Tween the mesh to the resolved coordinates, potentially different if the meshes overlap.
                        var tween = TweenLite.to([mesh.position, mesh.material], 1, { 
                            x: x1,
                            y: y1,
                            z: (self.settings.interface.far + o),
                            opacity: 1 
                        });
                    }      
                }
                self.app.cache('meshes', collection);
            },
            toggle: function(mesh){
                // Get the cached filtered collection, if applicable.                
                var cached = self.app.cache('meshes');
                for(var i in cached){
                    var meta,
                    node;
                    var cache = cached[i].get('mesh');
                    // The current cached mesh active state is determined by how close it is to the camera.
                    var active = (cache.position.z === self.settings.interface.near ? true : false);
                    // If the current cached mesh is active, deactivate it - restore it to it's original 'filtered' position.
                    if(active){
                        TweenLite.to([cache.position], 1, {
                            x: cache.static.position.x,
                            y: cache.static.position.y,
                            z: (self.settings.interface.far + cache.static.offset),
                        });   
                        self.overlay('', 0, 0, 0, true);
                        continue;      
                    }
                    // If the current cached mesh is equal to that selected, and is not active, activate it. 
                    if(cache === mesh){
                        var tween = TweenLite.to([mesh.position], 1, {
                            x: 0,
                            y: 0,
                            z: self.settings.interface.near,
                        }); 
                        var node = cached[i].get('node');                
                        tween.eventCallback('onComplete', function(){
                            var coords = self.getScreenCoordsOfMesh(mesh);
                            var c1 = coords[0].split(':');
                            var c2 = coords[1].split(':');
                            var x = c1[0];
                            var y = (self.renderer.context.canvas.height - (self.renderer.context.canvas.height - c1[1])) + 1;
                            var w = (c2[0] - c1[0]) + 1;
                            self.overlay('<div><a href="' + node['album_url'] + '" target="_blank">' + node['img_caption'] + '</a></div>', x, y, w, true);                         
                        });
                    }                  
                }                   
                return;
            },
            overlay: function(html, x, y, w, reset){
                if(reset){
                    self.container.find('.overlay').remove().end().append($('<div></div>', {
                        class: 'overlay',
                    }));
                }
                if(html.length > 0){
                    self.container.find('.overlay').css({
                        left: x + 'px',
                        bottom: y + 'px',
                        'max-width': w + 'px',
                    }).html(html);
                }
            },
            attachDOMEvents: function(mesh){  
                self.events.addEventListener(mesh, 'click', self.app.toggle, false);
            },
            /**
             * Get the perspective dimensions for a given length along the z plane, fov and aspect ratio.
             * @see  http://gamedev.stackexchange.com/questions/96317/determining-view-boundaries-based-on-z-position-when-using-a-perspective-project
             * @param int | z
             * @param int | fov
             * @param int | aspect
             */
            getPerspectiveDimensions: function(z, fov, aspect){
                // The height is multiplied by 2.0 to account for both the positive and negative portion of the plane.                
                var ph = Math.floor(2.0 * z * Math.tan(fov * 0.5 * (Math.PI / 180)));
                var pw = Math.floor(ph * aspect); 
                return [pw, ph];              
            },
            /**
             * Translate a mesh (vector) position (x,y,z) to it's relative position on screen (x,y). @see http://stackoverflow.com/questions/27409074/three-js-converting-3d-position-to-2d-screen-position-r69
             * @return object | vector
             */ 
            getScreenCoordsOfMesh: function(mesh){
                // Calculate the width and height, relative to the canvas.
                var w = (0.5 * self.renderer.context.canvas.width);
                var h = (0.5 * self.renderer.context.canvas.height);
                var bounds = [];
                // Clone the geometry object.
                var geometry = mesh.geometry.clone()   
                // Iterate through the vertices that form the plane. 
                for(var i in geometry.vertices){
                    // Get each respective vector. For a simple plane there will only be four that represent each edge - tl, tr, bl and br.
                    var vector = geometry.vertices[i];
                    // As the geometry z value for the vector wasn't set in the plane initialisation, use the current z pos of the mesh.
                    vector.z = mesh.position.z;
                    // Project the vector relative to the camera.
                    vector.project(self.camera);     
                    // Convert the projection x and y coords to screen representable values.        
                    var x = (vector.x * w) + w;
                    var y = -(vector.y * h) + h;
                    // Append the values to the bounds array.
                    bounds.push(x + ':' + y);
                }
                // The return being the tl, tr, bl and br of the plane.
                return bounds;         
            },
        };
    })(window, document);

});