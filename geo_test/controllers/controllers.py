# -*- coding: utf-8 -*-
from odoo import http

# class GeoTest(http.Controller):
#     @http.route('/geo_test/geo_test/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/geo_test/geo_test/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('geo_test.listing', {
#             'root': '/geo_test/geo_test',
#             'objects': http.request.env['geo_test.geo_test'].search([]),
#         })

#     @http.route('/geo_test/geo_test/objects/<model("geo_test.geo_test"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('geo_test.object', {
#             'object': obj
#         })