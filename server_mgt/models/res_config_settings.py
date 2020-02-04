
from odoo.tools.safe_eval import safe_eval
from odoo import models, fields, api, exceptions, _

# from fabric.api import *
# from fabric.contrib.files import append
# import os

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'


    ssh_key_generated = fields.Boolean(string='SSH key generated')
    public_key = fields.Text(string='Public key')

    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        ICPSudo = self.env['ir.config_parameter'].sudo()
        ssh_key_generated = ICPSudo.get_param("ssh_key_generated", default=False)
        public_key = ICPSudo.get_param("public_key", default=False)

        res.update(
            ssh_key_generated=ssh_key_generated,
            public_key=public_key,
        )
        return res

    # @api.multi
    # def set_values(self):
    #     super(ResConfigSettings, self).set_values()
    #     ICPSudo = self.env['ir.config_parameter'].sudo()
    #     ICPSudo.set_param("ssh_key_generatedt", self.ssh_key_generated or False)


    # def check_local_server(self):
    #     ICPSudo = self.env['ir.config_parameter'].sudo()
        
    #     try:
    #         path = ''
    #         with lcd('~/'):
    #             d = local('pwd', capture=True)
    #             path = '%s/.ssh/id_rsa.pub' % d
    #         with open(path) as f:
    #             key = f.read()

    #             ICPSudo.set_param("ssh_key_generated", True)
    #             ICPSudo.set_param("public_key", key)
    #     except OSError:
    #         ICPSudo.set_param("ssh_key_generated", True)
    #         pass



