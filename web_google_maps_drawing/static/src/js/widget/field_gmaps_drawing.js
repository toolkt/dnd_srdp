odoo.define('widget_google_maps_drawing.FieldMapDrawingShape', function (require) {
    'use strict';

    var core = require('web.core');
    var BasicFields = require('web.basic_fields');
    var _t = core._t;
    var qweb = core.qweb;

    var FieldMapDrawingShape = BasicFields.InputField.extend({
        class: 'o_field_text o_field_map_drawing',
        tagName: 'div',
        template: 'WidgetDrawing.Map',
        supportedFieldTypes: ['text'],
        init: function () {
            this._super.apply(this, arguments);
            this.selectedShapes = {};
            this.editModeColor = '#006ee5';
        },
        /**
         * Override
         */
        start: function () {
            this._initMap();
            return this._super();
        },
        /**
         * @private
         * Initialize map
         */
        _initMap: function () {
            this.gmap = new google.maps.Map(this.$('.o_map_view').get(0), {
                center: {
                    lat: 12.8797,
                    lng: 121.7740
                },
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                zoom: 6,
                minZoom: 3,
                maxZoom: 20,
                fullscreenControl: true,
                mapTypeControl: true,
                gestureHandling: 'cooperative',
                mapTypeControlOptions: {
                    mapTypeIds: ['satellite', 'hybrid', 'terrain'],
                    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                }
            });
        },
        /**
         * @private
         * Initialize drawing manager
         */
        _initDrawing: function (mode) {
            console.log("A");
            var drawingOptions = {
                fillColor: this.editModeColor,
                strokeWeight: 0,
                fillOpacity: 0.45,
                editable: true
            };
            var polylineOptions = {
                strokeColor: this.editModeColor,
                strokeWeight: 2
            };
            var circleOptions = {
                fillColor: this.editModeColor,
                fillOpacity: 0.45,
                strokeWeight: 0,
                editable: true,
                zIndex: 1
            };
            var markerOptions = {
                strokeWeight: 0,
                editable: true,
                zIndex: 1
            };


            this.gmapDrawingManager = new google.maps.drawing.DrawingManager({
                drawingControl: true,
                drawingControlOptions: {
                    position: google.maps.ControlPosition.BOTTOM_CENTER,
                    drawingModes: ['marker','circle', 'polygon', 'rectangle']
                },
                map: this.gmap,
                polylineOptions: {
                    editable: true
                },
                rectangleOptions: drawingOptions,
                polygonOptions: drawingOptions,
                circleOptions: circleOptions,
                polylineOptions: polylineOptions,
                markerOptions: markerOptions,
            });
            google.maps.event.addListener(this.gmapDrawingManager, 'overlaycomplete', this._overlayCompleted.bind(this));
            google.maps.event.addListener(this.gmapDrawingManager, 'drawingmode_changed', this._clearSelectedShape.bind(this));
            google.maps.event.addListener(this.gmap, 'click', this._clearSelectedShape.bind(this));
            this._loadDrawingActionButton();
            this._loadShapeExisted();
        },
        /**
         * @private
         * Draw existed shape
         */
        _loadShapeExisted: function () {
            console.log("B");
            var value = this._formatValue(this.value);
            if (value) {
                value = JSON.parse(value);
                if (value.type === 'polygon') {
                    var polygon = this._drawPolygon(value.options);
                    polygon.setOptions({
                        editable: true,
                        strokeColor: this.editModeColor,
                        fillColor: this.editModeColor,
                    });
                    var selectedShape = polygon;
                    selectedShape.type = 'polygon';
                    this._setSelectedShape(selectedShape);
                    google.maps.event.addListener(selectedShape, 'dblclick', this._setSelectedShape.bind(this, selectedShape));
                    // event to handle when user editing polygon
                    google.maps.event.addListener(polygon.getPath(), 'set_at', this._onPolygonCommit.bind(this));
                    google.maps.event.addListener(polygon.getPath(), 'insert_at', this._onPolygonCommit.bind(this));
                } else if (value.type === 'rectangle') {
                    var rectangle = this._drawRectangle(value.options);
                    rectangle.setOptions({
                        editable: true,
                        draggable: true,
                        strokeColor: this.editModeColor,
                        fillColor: this.editModeColor,
                    });
                    var selectedShape = rectangle;
                    selectedShape.type = 'rectangle';
                    this._setSelectedShape(selectedShape);
                    // event to handle when user editing rectangle
                    google.maps.event.addListener(selectedShape, 'click', this._setSelectedShape.bind(this, selectedShape));
                    google.maps.event.addListener(rectangle, 'bounds_changed', this._onRectangleCommit.bind(this));
                } else if (value.type === 'circle') {
                    var circle = this._drawCircle(value.options);
                    circle.setOptions({
                        editable: true,
                        draggable: true,
                        strokeColor: this.editModeColor,
                        fillColor: this.editModeColor,
                    });
                    var selectedShape = circle;
                    selectedShape.type = 'circle';
                    this._setSelectedShape(selectedShape);
                    google.maps.event.addListener(selectedShape, 'click', this._setSelectedShape.bind(this, selectedShape));
                    // event to handle when user editing circle
                    google.maps.event.addListener(circle, 'radius_changed', this._onCircleCommit.bind(this));
                    google.maps.event.addListener(circle, 'center_changed', this._onCircleCommit.bind(this));
                } else if (value.type === 'marker') {
                    var marker = this._drawMarker(value.options);
                    marker.setOptions({
                        editable: true,
                        draggable: true,
                        strokeColor: this.editModeColor,
                        fillColor: this.editModeColor,
                    });
                    var selectedShape = marker;
                    selectedShape.type = 'marker';
                    this._setSelectedShape(selectedShape);
                    google.maps.event.addListener(selectedShape, 'click', this._setSelectedShape.bind(this, selectedShape));
                    // event to handle when user editing circle
                    google.maps.event.addListener(marker, 'position_changed', this._onMarkerCommit.bind(this));
                }
            }
        },
        /**
         * @private
         * Draw polygon
         */
        _drawPolygon: function (options) {
            console.log("C");
            var polygon = new google.maps.Polygon({
                strokeColor: '#FF0000',
                strokeOpacity: 0.85,
                strokeWeight: 1.0,
                fillColor: '#FF9999',
                fillOpacity: 0.35,
                editable: false,
                map: this.gmap,
            });
            polygon.setOptions(options);
            this._mapCenterMap(polygon.getPath());
            return polygon;
        },
        /**
         * @private
         * Draw rectangle
         */
        _drawRectangle: function (options) {
            console.log("D");
            var rectangle = new google.maps.Rectangle({
                strokeColor: '#FF0000',
                strokeOpacity: 0.85,
                strokeWeight: 1.0,
                fillColor: '#FF9999',
                fillOpacity: 0.35,
                map: this.gmap,
                editable: false,
                draggable: false
            });
            rectangle.setOptions(options);
            this._mapCenterMap(false, rectangle.getBounds());
            return rectangle;
        },
        /**
         * @private
         * Draw circle
         */
        _drawCircle: function (options) {
            console.log("E");
            var circle = new google.maps.Circle({
                strokeColor: '#FF0000',
                strokeOpacity: 0.85,
                strokeWeight: 1.0,
                fillColor: '#FF9999',
                fillOpacity: 0.35,
                map: this.gmap,
                editable: false,
                draggable: false
            });
            circle.setOptions(options);
            this._mapCenterMap(false, circle.getBounds());
            return circle;
        },
        /**
         * @private
         * Draw polygon
         */
        _drawMarker: function (options) {
            console.log("C",options);
            var marker = new google.maps.Marker({
                map: this.gmap,
            });
            marker.setOptions(options);

            var bounds = new google.maps.LatLngBounds();
            bounds.extend(marker.getPosition());

            this._mapCenterMap(false, bounds);
            console.log(marker);
            return marker;
        },
        /**
         * @override
         */
        _renderReadonly: function () {
            console.log("F");
            var value = this._formatValue(this.value);
            if (value) {
                var shapePath = JSON.parse(value);
                var shapeOptions = shapePath.options;
                if (shapePath.type === 'polygon') {
                    this._drawPolygon(shapeOptions);
                } else if (shapePath.type === 'rectangle') {
                    this._drawRectangle(shapeOptions);
                } else if (shapePath.type === 'circle') {
                    this._drawCircle(shapeOptions);
                } else if (shapePath.type === 'marker') {
                    this._drawMarker(shapeOptions);
                }
            }
        },
        /**
         * @override 
         */
        _renderEdit: function () {
            console.log("G");
            this._super.apply(this, arguments);
            this._initDrawing();
        },
        /**
         * @private
         * Callback function when overlay is completed
         */
        _overlayCompleted: function (event) {
            console.log("H");
            // Switch back to non-drawing mode after drawing a shape.
            this.gmapDrawingManager.setDrawingMode(null);

            var newShape = event.overlay;
            var uniqueId = new Date().getTime();

            newShape.type = event.type;
            newShape._drawId = uniqueId;

            this.selectedShapes[uniqueId] = newShape;
            google.maps.event.addListener(newShape, 'click', this._setSelectedShape.bind(this, newShape));
            this._setSelectedShape(newShape);
            this._commitShapeDraw();
        },
        /**
         * @private
         * Set selected shape
         */
        _setSelectedShape: function (newShape) {
            console.log("I",newShape);
            this.selectedShape = newShape;
            if (this.selectedShape.type == 'marker') {
                this.selectedShape.setDraggable(true);
            } else {
                this.selectedShape.setEditable(true);
            }
        },

        /**
         * @private
         * Clear selected shape
         */
        _clearSelectedShape: function () {
            console.log("J",this.selectedShape);
            if (this.selectedShape) {
                if (this.selectedShape.type == 'marker') {
                    this.selectedShape = null;    
                }else{
                    this.selectedShape.setEditable(false);
                    this.selectedShape = null;                    
                }

            }
        },
        /**
         * @private
         * Load action buttons into the map
         */
        _loadDrawingActionButton: function () {
            console.log("K");
            if (this.$btnDrawingClear === undefined) {
                this.$btnDrawingClear = $(qweb.render('WidgetDrawing.BtnDelete', {
                    widget: this
                }));
                this.gmap.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(this.$btnDrawingClear.get(0));
                this.$btnDrawingClear.on('click', this._deleteSelectedShaped.bind(this));
            }
        },
        /**
         * @private
         * Polygon 
         */
        _onPolygonCommit: function () {
            console.log("L");
            var paths = this.selectedShape.getPath();
            var area = google.maps.geometry.spherical.computeArea(paths);
            var paths_latLng = [];
            paths.forEach(function (item) {
                paths_latLng.push({
                    'lat': item.lat(),
                    'lng': item.lng()
                });
            });
            var values = {
                'shape_type': this.selectedShape.type,
                'shape_area': area,
            };
            var shape_paths = {
                'type': this.selectedShape.type,
                'options': {
                    paths: paths_latLng
                }
            };
            this._onTriggerUp(values, shape_paths);
        },
        _onRectangleCommit: function () {
            console.log("M");
            var values = {
                'shape_type': this.selectedShape.type,
            };
            var bounds = this.selectedShape.getBounds();
            var directions = bounds.toJSON();
            var shape_paths = {
                'type': this.selectedShape.type,
                'options': {
                    'bounds': directions
                }
            };
            this._onTriggerUp(values, shape_paths);
        },
        _onCircleCommit: function () {
            console.log("N");
            var radius = this.selectedShape.getRadius();
            var center = this.selectedShape.getCenter();
            var values = {
                'shape_type': this.selectedShape.type,
                'shape_radius': radius
            };
            var shape_paths = {
                'type': this.selectedShape.type,
                'options': {
                    radius: radius,
                    center: {
                        'lat': center.lat(),
                        'lng': center.lng()
                    }
                }
            };
            this._onTriggerUp(values, shape_paths);
        },
        _onMarkerCommit2: function () {
            console.log("N2",this.selectedShape);
            var values = {
                'shape_type': this.selectedShape.type,
            };
            var pos = this.selectedShape.getPosition();
            var position = pos.toJSON();
            var shape_paths = {
                'type': this.selectedShape.type,
                'options': {
                    'position': position,
                    'draggable' : true,
                }
            };
            this._onTriggerUp(values, shape_paths);
        },
        _onMarkerCommit: function () {
            console.log("N3");
            // var center = this.selectedShape.getCenter();
            var values = {
                'shape_type': this.selectedShape.type,
            };
            var pos = this.selectedShape.getPosition();
            var position = pos.toJSON();
            var shape_paths = {
                'type': this.selectedShape.type,
                'options': {
                    position: position,
                    // center: {
                    //     'lat': center.lat(),
                    //     'lng': center.lng()
                    // }
                }
            };
            this._onTriggerUp(values, shape_paths);
        },

        _onTriggerUp: function (values, shape_paths) {
            console.log("O");
            var values = values || {};
            var shape_paths = shape_paths || {};
            values['shape_paths'] = JSON.stringify(shape_paths);
            this.trigger_up('field_changed', {
                dataPointID: this.dataPointID,
                changes: values,
                viewType: this.viewType
            });
        },
        /**
         * @private
         */
        _commitShapeDraw: function () {
            console.log("P");
            if (Object.keys(this.selectedShapes).length > 1) {
                this.do_warn(_t('Only one shape is allowed!'));
                return;
            }
            if (this.selectedShape.type === 'polygon') {
                this._onPolygonCommit();
            } else if (this.selectedShape.type === 'rectangle') {
                this._onRectangleCommit();
            } else if (this.selectedShape.type === 'circle') {
                this._onCircleCommit();
            } else if (this.selectedShape.type === 'marker') {
                this._onMarkerCommit();
            }
        },
        _deleteSelectedShaped: function (event) {
            console.log("Q");
            event.preventDefault();
            if (this.selectedShape) {
                delete this.selectedShapes[this.selectedShape._drawId];
                this.selectedShape.setMap(null);
                this._onTriggerUp();
            }
        },
        _mapCenterMap: function (paths, bounds) {
            console.log("R");
            paths = paths || [];
            bounds = bounds || false;
            var mapBounds = new google.maps.LatLngBounds();
            if (paths.length > 0) {
                paths.forEach(function (item) {
                    mapBounds.extend({ lat: item.lat(), lng: item.lng() });
                });
            } else if (bounds) {
                mapBounds.union(bounds);
            }
            this.gmap.fitBounds(mapBounds);
        },
    });

    return FieldMapDrawingShape;

});