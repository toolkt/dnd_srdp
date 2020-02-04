{
    "name": """Min.io Attachment Storage""",
    "summary": """Upload attachments on Minio S3 Buckets""",
    "category": "Tools",
    "images": [],
    "version": "11.0.1.2.0",
    "application": False,

    "author": "Toolkit",
    "website": "https://toolkt.info",
    "license": "AGPL-3",

    "depends": [
        'base_setup',
        'ir_attachment_url',
    ],
    "external_dependencies": {"python": ['boto3'], "bin": []},
    "data": [
        "security/ir.model.access.csv",
        "views/res_config_settings_views.xml",
    ],
    "qweb": [
    ],
    "demo": [
    ],

    "post_load": None,
    "pre_init_hook": None,
    "post_init_hook": None,

    "auto_install": False,
    "installable": True,
}
