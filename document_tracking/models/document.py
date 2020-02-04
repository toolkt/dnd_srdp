# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import json
import logging

import requests

from odoo import api, fields, models, tools, _
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)




class DocumentWorkflowStage(models.Model):
    _name = 'document.workflow'

    name = fields.Char("Name")
    user_id = fields.Many2many('res.users','Managers')
    stage_ids = fields.One2many('document.workflow.stage','workflow_id','Stages')


class DocumentWorkflowStage(models.Model):
    _name = 'document.workflow.stage'

    name = fields.Char("Name")
    user_id = fields.Many2many('res.users','Users')
    workflow_id = fields.Many2one('document.workflow','Workflow')


class DocumentRecord(models.Model):
    _name = 'document.record'
    _inherit = ['mail.thread']
    _description = 'Document Records'

    name = fields.Char("Document Name")
    description = fields.Text("Document Description")
    stage_id = fields.Many2one("document.workflow.stage")
    color = fields.Integer(string='Color Index')
    user_id = fields.Many2one('res.users','Responsible')
