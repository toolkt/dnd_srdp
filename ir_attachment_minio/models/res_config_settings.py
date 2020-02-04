import base64
import hashlib

from odoo.tools.safe_eval import safe_eval
from odoo import models, fields, api, exceptions, _


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'


    endpoint_url = fields.Char(string='Endpoint URL')
    s3_bucket = fields.Char(string='S3 bucket name', help="i.e. 'attachmentbucket'")
    s3_access_key_id = fields.Char(string='S3 access key id')
    s3_secret_key = fields.Char(string='S3 secret key')
    s3_condition = fields.Char(string='S3 condition',
                               help="""Specify valid odoo search domain here,
                               e.g. [('res_model', 'in', ['product.image'])] -- store data of product.image only.
                               Empty condition means all models""")

    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        ICPSudo = self.env['ir.config_parameter'].sudo()
        s3_bucket = ICPSudo.get_param("s3.bucket", default='')
        s3_access_key_id = ICPSudo.get_param("s3.access_key_id", default='')
        s3_secret_key = ICPSudo.get_param("s3.secret_key", default='')
        s3_condition = ICPSudo.get_param("s3.condition", default='')
        endpoint_url = ICPSudo.get_param("endpoint.url", default='')

        res.update(
            endpoint_url=endpoint_url,
            s3_bucket=s3_bucket,
            s3_access_key_id=s3_access_key_id,
            s3_secret_key=s3_secret_key,
            s3_condition=s3_condition
        )
        return res

    @api.multi
    def set_values(self):
        super(ResConfigSettings, self).set_values()
        ICPSudo = self.env['ir.config_parameter'].sudo()
        ICPSudo.set_param("s3.bucket", self.s3_bucket or '')
        ICPSudo.set_param("s3.access_key_id", self.s3_access_key_id or '')
        ICPSudo.set_param("s3.secret_key", self.s3_secret_key or '')
        ICPSudo.set_param("s3.condition", self.s3_condition or '')
        ICPSudo.set_param("endpoint.url", self.endpoint_url or '')

    def upload_existing(self):
        condition = self.s3_condition and safe_eval(self.s3_condition, mode="eval") or []
        domain = [('type', '!=', 'url'), ('id', '!=', 0)] + condition
        attachments = self.env['ir.attachment'].search(domain)
        attachments = attachments._filter_protected_attachments()

        if attachments:

            s3 = self.env['ir.attachment']._get_s3_resource()

            if not s3:
                raise exceptions.MissingError(_("Some of the S3 connection credentials are missing.\n Don't forget to click the ``[Apply]`` button after any changes you've made"))

            for attach in attachments:
                value = attach.datas
                bin_data = base64.b64decode(value) if value else b''
                fname = hashlib.sha1(bin_data).hexdigest()

                bucket_name = self.s3_bucket

                try:
                    s3.Bucket(bucket_name).put_object(
                        Key=fname,
                        Body=bin_data,
                        ACL='public-read',
                        ContentType=attach.mimetype,
                        )
                except Exception as e:
                    raise exceptions.UserError(e.message)

                vals = {
                    'file_size': len(bin_data),
                    'checksum': attach._compute_checksum(bin_data),
                    'index_content': attach._index(bin_data, attach.datas_fname, attach.mimetype),
                    'store_fname': fname,
                    'db_datas': False,
                    'type': 'url',
                    'url': attach._get_s3_object_url(s3, bucket_name, fname),
                }
                attach.write(vals)
