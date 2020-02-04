# -*- coding: utf-8 -*-
{
    'name': 'SRDP Area',
    'version': '12.0.1.0.1',
    'author': 'Toolkit',
    'license': 'AGPL-3',
    'maintainer': 'Toolkit',
    'support': 'toolkt@gmail.com',
    'category': 'Hidden',
    'description': """
Partner Area
============
""",
    'depends': [
        'mail',
        'web_google_maps',
        'web_google_maps_drawing',
        'web_widget_google_maps',
        'google_marker_icon_picker',
        'web_timeline',
        'web_widget_color',
        'project',
    ],
    'website': '',
    'data': [
        'security/ir.model.access.csv',
        'views/camp_view.xml',
        'views/camp_area_view.xml',
    ],
    'demo': [],
    'installable': True
}
