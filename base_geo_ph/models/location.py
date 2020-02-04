# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
from odoo import api, fields, models



class ResGeoCity(models.Model):
    _name = "res.geo.city"

    priority = fields.Integer('Priority', default=100)
    rec_id = fields.Integer('ID', index=True, required=True)
    name = fields.Char('Name', index=True, required=True)
    the_geom = fields.GeoMultiPolygon('NPA Shape')


class ResGeoBrgy(models.Model):
    _name = "res.geo.brgy"

    priority = fields.Integer('Priority', default=100)
    rec_id = fields.Integer('ID', index=True)
    name = fields.Char('Name', index=True, required=True)
    the_geom = fields.GeoMultiPolygon('NPA Shape')
