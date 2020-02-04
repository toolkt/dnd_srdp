# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import json
import logging

import requests

from odoo import api, fields, models, tools, _
from odoo.exceptions import UserError
from odoo.tools.safe_eval import safe_eval

_logger = logging.getLogger(__name__)



def geo_find(addr, apikey=False):
    if not addr:
        return None

    if not apikey:
        raise UserError(_('''API key for GeoCoding (Places) required.\n
                          Save this key in System Parameters with key: google.api_key_geocode, value: <your api key>
                          Visit https://developers.google.com/maps/documentation/geocoding/get-api-key for more information.
                          '''))

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    try:
        result = requests.get(url, params={'sensor': 'false', 'address': addr, 'key': apikey}).json()
    except Exception as e:
        raise UserError(_('Cannot contact geolocation servers. Please make sure that your Internet connection is up and running (%s).') % e)

    if result['status'] != 'OK':
        if result.get('error_message'):
            _logger.error(result['error_message'])
        return None

    try:
        geo = result['results'][0]['geometry']['location']
        return float(geo['lat']), float(geo['lng'])
    except (KeyError, ValueError):
        return None


def geo_query_address(street=None, zip=None, city=None, state=None, country=None):
    if country and ',' in country and (country.endswith(' of') or country.endswith(' of the')):
        # put country qualifier in front, otherwise GMap gives wrong results,
        # e.g. 'Congo, Democratic Republic of the' => 'Democratic Republic of the Congo'
        country = '{1} {0}'.format(*country.split(',', 1))
    return tools.ustr(', '.join(
        field for field in [street, ("%s %s" % (zip or '', city or '')).strip(), state, country]
        if field
    ))





class DNDCampTag(models.Model):
    _name = 'dnd.camp.tag'

    name = fields.Char("Name")
    color = fields.Integer(string='Color Index')


class DNDAreaTag(models.Model):
    _name = 'dnd.area.tag'

    name = fields.Char("Name")
    color = fields.Integer(string='Color Index')


class DNDBoS(models.Model):
    _name = 'dnd.bos'

    name = fields.Char("Branch")
    color = fields.Char(string='Color Index', default='red')


class DNDCampBatch(models.TransientModel):
    _name = 'dnd.camp.batch'
    _description = 'DND Camp Action'


    @api.multi
    def geolocalize(self):
        # use active_ids to add picking line to the selected batch
        self.ensure_one()
        active_ids = self.env.context.get('active_ids')
        return self.env['dnd.camp'].browse(active_ids).geo_localize()



class DNDCamp(models.Model):
    _name = 'dnd.camp'
    _inherit = ['mail.thread']
    _description = 'Camps'

    name = fields.Char("Name")
    area = fields.Float("Area")
    town = fields.Char("Town")
    city = fields.Char("City")
    province = fields.Char("Province")
    project_id = fields.Many2one('project.project','Project ID')


    description = fields.Text("Description")

    camp_latitude = fields.Float(string='Geo Latitude', digits=(16, 5))
    camp_longitude = fields.Float(string='Geo Longitude', digits=(16, 5))
    date_localization = fields.Date(string='Geolocation Date')

    priority = fields.Integer("Priority")
    doc_exp = fields.Float("Doc Data Research Expense")
    survey_exp = fields.Float("Survey Expenses")
    admin_exp = fields.Float("Admin Supervision Expenses")
    aquisition_exp = fields.Float("Aquisition Cost")
    other_fees = fields.Float("Other Fees & Taxes")
    equipment = fields.Float("Equipment Aquisition Cost")
    total = fields.Float("Total", compute='_get_total', store=True)
    boh = fields.Selection([('PA','PA'),('PN','PN'),('PAF','PAF'),('GHQ','GHQ'),('GA','GA')],"Branch of Service")   
    bos = fields.Many2one('dnd.bos',"Branch of Service")
    marker_color = fields.Char(string='Marker Color', related='bos.color')

    tags = fields.Many2many('dnd.camp.tag',string="Tags")   
    description = fields.Char("Description")             

    shape_line_ids = fields.One2many('dnd.camp.area', 'camp_id', string='Area')
    disp_shape_line_ids = fields.One2many('dnd.camp.area', 'camp_id',compute='get_shape_line_ids', string='Area')
    
    activity_ids = fields.One2many('dnd.camp.activity', 'camp_id', string='Activities')
    attachment_ids = fields.Many2many('ir.attachment', string='Files')


    active = fields.Boolean(default=True, help="The active field allows you to hide the category without removing it.")
    image = fields.Binary(attachment=True, help="This field holds the image used as image for the category, limited to 1024x1024px.")
    image_medium = fields.Binary(string='Medium-sized image', attachment=True,
                                 help="Medium-sized image of the category. It is automatically "
                                 "resized as a 128x128px image, with aspect ratio preserved. "
                                 "Use this field in form views or some kanban views.")
    image_small = fields.Binary(string='Small-sized image', attachment=True,
                                help="Small-sized image of the category. It is automatically "
                                "resized as a 64x64px image, with aspect ratio preserved. "
                                "Use this field anywhere a small image is required.")


    filter_tags = fields.Many2many('dnd.area.tag', string="Tags")  

    # @api.onchange('filter_tags')
    # def onchange_filter_tag(self):
    #     return {'domain': {'shape_line_ids': [('tag', 'in',)]}}




    @api.one
    @api.depends('filter_tags')
    def get_shape_line_ids(self):
        ids = self.env['dnd.camp.area'].search([('tag','in',[x.id for x in self.filter_tags])])
        print (ids)
        self.disp_shape_line_ids = ids


    @api.model
    def create(self, vals):
        tools.image_resize_images(vals)
        return super(DNDCamp, self).create(vals)

    @api.multi
    def write(self, vals):
        tools.image_resize_images(vals)
        return super(DNDCamp, self).write(vals)


    @api.depends('doc_exp','survey_exp','admin_exp','aquisition_exp','other_fees','equipment')
    @api.multi
    def _get_total(self):
        for rec in self:
            rec.total = rec.doc_exp+rec.survey_exp+rec.admin_exp+rec.aquisition_exp+rec.other_fees+rec.equipment


    @classmethod
    def _geo_localize(cls, apikey, street='', zip='', city='', state='', country=''):
        search = geo_query_address(street=street, zip=zip, city=city, state=state, country=country)
        result = geo_find(search, apikey)
        if result is None:
            search = geo_query_address(city=city, state=state, country=country)
            result = geo_find(search, apikey)
        return result

    @api.multi
    def geo_localize(self):
        # We need country names in English below
        apikey = self.env['ir.config_parameter'].sudo().get_param('google.api_key_geocode')
        for rec in self.with_context(lang='en_US'):
            result = rec._geo_localize(apikey,
                                           rec.name,
                                           '',
                                           rec.city,
                                           rec.province,
                                           'Philippines')
            if result:
                rec.write({
                    'camp_latitude': result[0],
                    'camp_longitude': result[1],
                    'date_localization': fields.Date.context_today(rec)
                })
            print(result)
        return True


    @api.multi
    def action_view_activity_timeline(self):
        for rec in self:
            ids = [a.id for a in rec.activity_ids]
            view_id = self.env.ref('dnd_srdp.view_dnd_camp_activity_timeline').id


            action = {
                'name': 'Timeline',
                'res_model': 'dnd.camp.activity',
                'type': 'ir.actions.act_window',
                'view_mode': 'timeline',
                'view_id': view_id,
                'target': 'new',
                'flags': {'search_view': True, 'action_buttons': True},
                'domain': [('id', 'in', ids)],
            }
            print(action)
            return action




class MapPaths(models.Model):
    _name = 'map.paths'

    lat = fields.Char("Latitude")
    lng = fields.Char("Longitude")



class DNDCampAreaMapPaths(models.Model):
    _name = 'dnd.camp.area.map.paths'
    _inherit = 'map.paths'

    area_id = fields.Many2one('dnd.camp.area',"Area")




class DNDCampArea(models.Model):
    """ Inherit Drawing mixins model 'google_maps.drawing.shape.mixin' """
    _name = 'dnd.camp.area'
    _inherit = ['mail.thread', 'google_maps.drawing.shape.mixin']
    _description = 'Area'

    tag = fields.Many2many('dnd.area.tag',string="Tags")   
    camp_id = fields.Many2one('dnd.camp', required=True, ondelete='cascade')
    shape_paths_disp = fields.Text('Shape', related='shape_paths')
    shape_paths_manual = fields.Text('Manual Shape')
    path_ids = fields.One2many('dnd.camp.area.map.paths','area_id',"Paths")
    color = fields.Char("Color")
    area_size = fields.Integer("Area (Ha)")
    date = fields.Date("Date")


    @api.onchange('shape_paths')
    def onchange_shape_paths(self):
        self.shape_paths_manual = self.shape_paths

    @api.multi
    def set_paths(self):
        for rec in self:
            # shape = {"type":"polygon","options":{"paths":[]}}

            # array = safe_eval(json.dumps(rec.shape_paths_manual.replace('\n', ' ')))

            # for p in array:
            #     print(p)
            paths = (json.loads(rec.shape_paths))
            if rec.color:
                paths['options']['fillColor'] = rec.color
                paths['options']['strokeColor'] = rec.color

            # print()
            rec.shape_paths_manual = json.dumps(paths)
            rec.shape_paths = rec.shape_paths_manual




class DNDCampActivity(models.Model):
    _name = 'dnd.camp.activity'
    _inherit = ['mail.thread', 'google_maps.drawing.shape.mixin']
    _description = 'Activity'

    camp_id = fields.Many2one('dnd.camp', required=True, ondelete='cascade')
    date_start = fields.Date("Date Start")
    date_end = fields.Date("Date End")
    name = fields.Char("Name")
    description = fields.Char("Description")
    notes = fields.Text("Notes")

