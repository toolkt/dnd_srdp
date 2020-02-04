# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
{'name': 'Philippine Geolocation',
 'version': '12.0.1.0.0',
 'category': 'GeoBI',
 'author': "Toolkit",
 'license': 'AGPL-3',
 'website': 'http://toolkt.com',
 'depends': [
     'base_geoengine'
 ],
 'data': [
     'views/menus.xml',
     'views/city.xml',
     'views/brgy.xml',
     'data/city.xml',
     #'data/brgy.xml',
     'security/ir.model.access.csv'
 ],
 'external_dependencies': {
     'python': [
         'geojson',
     ],
 },
 'installable': True,
 'application': True,
 }
