# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Server Management',
    'version': '1.0',
    'category': 'Tools',
    'description': "",
    'website': 'https://www.toolkt.com',
    'summary': 'Manage your Odoo Instance',
    'sequence': 45,
    'depends': [
        'mail',
    ],
    'data': [
        'security/ir.model.access.csv',
        'views/res_config_settings_view.xml',
        'views/odoo_server.xml',
    ],
    'demo': [
        
    ],
    'qweb': [
        
    ],
    'test': [
    ],
    'installable': True,
    'application': True,
    'auto_install': False,
}

