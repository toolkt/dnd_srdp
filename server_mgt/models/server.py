from odoo import models, fields, api
import datetime
import time
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT
from odoo.exceptions import ValidationError
from odoo.tools.translate import _


import os
import paramiko
from fabric2 import Connection




class ServerInstance(models.Model):
    _name = "server.instance"
    _description = 'Server Instance'
    
    name = fields.Char('Server Name')
    host = fields.Char('Host')
    user = fields.Char('User')
    port = fields.Integer('Port', default=22)
    password = fields.Char('Password')
    certificate = fields.Text('Certificate')
    send_public_key = fields.Boolean('Send Public Key')
    install_postgres = fields.Boolean('Install Postgres')
    install_tomcat = fields.Boolean('Install Tomcat')

    log_ids = fields.One2many('server.instance.log','server_id','Logs')


    @api.multi
    def paramiko_ssh_connect(self):
        self.ensure_one()
        client= paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.load_host_keys(os.path.expanduser('~/.ssh/known_hosts'))
        client.connect(self.host, port=self.port,username=self.user, password=self.password, timeout=20)
        return client

    #DONE
    @api.multi
    def deploy_public_key(self):
        self.ensure_one()
        try:
            print ("Deploy SSH Key")
            key = open(os.path.expanduser('~/.ssh/id_rsa.pub')).read()
            os.system('whoami')
            os.system('mkdir -p ~/.ssh/')
            os.system('touch ~/.ssh/known_hosts')

            client = self.paramiko_ssh_connect()
            client.exec_command('whoami')
            client.exec_command('mkdir -p ~/.ssh/')
            client.exec_command('echo "%s" > ~/.ssh/authorized_keys' % key)
            client.exec_command('chmod 644 ~/.ssh/authorized_keys')
            client.exec_command('chmod 700 ~/.ssh/')
            client.close()
            self.send_public_key = True
        except:
            self.send_public_key = False
            client.close()
            pass



    # @api.multi
    # def deploy_public_key(self):
    #     self.ensure_one()
    #     print ("Deploy SSH Key")

    #     c = Connection(host=self.host, user=self.user, port=22, connect_kwargs={"password": self.password})
        # key = c.local('cat ~/.ssh/id_rsa.pub').stdout
        # c.local('mkdir -p ~/.ssh/')
        # c.local('touch ~/.ssh/known_hosts')

        # c.run('mkdir -p ~/.ssh/')
        # c.run('echo "%s" > ~/.ssh/authorized_keys' % key)
        # c.run('chmod 644 ~/.ssh/authorized_keys')
        # c.run('chmod 700 ~/.ssh/')





    @api.multi
    def check_postgres_version(self):
        self.ensure_one()
        try:
            print ("Check Postgre Version")

            client = self.paramiko_ssh_connect()
            stdin, stdout, stderr = client.exec_command('whoami')
            client.close()
            self.send_public_key = True
        except:
            self.send_public_key = False
            client.close()
            pass



    def check_remote_server(self):
        for rec in self:
            self.deploy_public_key()



class ServerInstanceLog(models.Model):
    _name = "server.instance.log"
    _description = 'Server Instance Log'


    name = fields.Char('Name')
    server_id = fields.Many2one('Server')
    date = fields.Datetime('Date')
    log = fields.Char('Log')
