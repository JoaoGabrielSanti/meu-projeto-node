// Arquivo: server.js (VERSÃO FINAL E COMPLETA - LAYOUT LIMPO E CRUD TOTAL)

const express = require('express');
const session = require('express-session');
const db = require('./db'); 
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ----- CONFIGURAÇÕES DO EXPRESS -----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// ----- CONFIGURAÇÃO DA SESSÃO -----
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
    secret: 'sua-chave-secreta-de-sessao-forte-123456',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    } 
}));
if (isProduction) {
    app.set('trust proxy', 1);
}

// ----- MIDDLEWARE DE AUTENTICAÇÃO -----
function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// ========================================================
// ROTAS PÚBLICAS (LOGIN)
// ========================================================
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login-action', async (req, res) => {
    const { login, senha } = req.body;
    try {
        const [rows] = await db.query(
            'SELECT * FROM Usuario WHERE login = ? AND senha = ?',
            [login, senha]
        );
        if (rows.length > 0) {
            const usuario = rows[0];
            req.session.user = {
                id: usuario.id_usuario,
                nome: usuario.nome,
                login: usuario.login
            };
            res.redirect('/dashboard');
        } else {
            res.render('login', { error: 'Login ou senha inválidos.' });
        }
    } catch (err) {
        console.error("Erro no /login-action:", err);
        res.render('login', { error: 'Ocorreu um erro no servidor.' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error(err);
        res.redirect('/login');
    });
});

// ========================================================
// ROTAS PROTEGIDAS (DASHBOARD E CONFIGURAÇÕES)
// ========================================================
app.get('/dashboard', checkAuth, async (req, res) => {
    try {
        const [
            [[emprestimoStats]], 
            [[usuarioStats]],
            [[bancoStats]]
        ] = await Promise.all([
            db.query('SELECT COUNT(*) AS totalEmprestimos, SUM(valor) AS totalValor FROM Emprestimo'),
            db.query('SELECT COUNT(*) AS totalUsuarios FROM Usuario'),
            db.query('SELECT COUNT(*) AS totalBancos FROM Banco_Financeira')
        ]);
        const stats = {
            totalEmprestimos: emprestimoStats.totalEmprestimos || 0,
            totalValor: emprestimoStats.totalValor || 0,
            totalUsuarios: usuarioStats.totalUsuarios || 0,
            totalBancos: bancoStats.totalBancos || 0
        };
        res.render('dashboard', { 
            user: req.session.user, 
            stats: stats 
        });
    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
        res.render('dashboard', { 
            user: req.session.user,
            stats: { totalEmprestimos: 0, totalValor: 0, totalUsuarios: 0, totalBancos: 0 }
        });
    }
});

app.get('/configuracoes', checkAuth, async (req, res) => {
    try {
        const idUsuarioLogado = req.session.user.id;
        const [rows] = await db.query('SELECT * FROM Usuario WHERE id_usuario = ?', [idUsuarioLogado]);
        if (rows.length > 0) {
            res.render('configuracoes', { 
                user: req.session.user, 
                usuario: rows[0] 
            });
        } else {
            req.session.destroy(() => res.redirect('/login'));
        }
    } catch (err) {
        console.error("Erro ao carregar configurações:", err);
        res.redirect('/dashboard');
    }
});

// ========================================================
// CRUD DE USUÁRIOS
// ========================================================
app.get('/usuarios', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Usuario ORDER BY nome');
        res.render('usuarios', { 
            usuarios: rows, 
            user: req.session.user 
        });
    } catch (err) {
        console.error("Erro ao listar usuários:", err);
        res.redirect('/dashboard');
    }
});

// ROTA GET: Formulário de inclusão de usuário (VISUAL LIMPO)
app.get('/usuarios/novo', checkAuth, (req, res) => {
    res.render('usuario-incluir', { user: req.session.user });
});

app.post('/usuarios/incluir', checkAuth, async (req, res) => {
    const { nome, login, senha, cargo, perfil } = req.body;
    try {
        await db.query(
            'INSERT INTO Usuario (nome, login, senha, cargo, perfil) VALUES (?, ?, ?, ?, ?)',
            [nome, login, senha, cargo, perfil]
        );
        res.redirect('/usuarios');
    } catch (err) {
        console.error("Erro ao incluir usuário:", err);
        res.redirect('/usuarios');
    }
});
app.get('/usuarios/editar/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM Usuario WHERE id_usuario = ?', [id]);
        if (rows.length > 0) {
            res.render('usuario-editar', { 
                usuario: rows[0], 
                user: req.session.user 
            });
        } else {
            res.redirect('/usuarios');
        }
    } catch (err) {
        console.error("Erro ao buscar usuário para edição:", err);
        res.redirect('/usuarios');
    }
});
app.post('/usuarios/editar/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    const { nome, login, senha, cargo, perfil } = req.body;
    try {
        if (senha) { // Atualiza a senha se for fornecida
            await db.query(
                'UPDATE Usuario SET nome = ?, login = ?, senha = ?, cargo = ?, perfil = ? WHERE id_usuario = ?',
                [nome, login, senha, cargo, perfil, id]
            );
        } else { // Não atualiza a senha se estiver vazia
            await db.query(
                'UPDATE Usuario SET nome = ?, login = ?, cargo = ?, perfil = ? WHERE id_usuario = ?',
                [nome, login, cargo, perfil, id]
            );
        }
        res.redirect('/usuarios');
    } catch (err) {
        console.error("Erro ao editar usuário:", err);
        res.redirect('/usuarios');
    }
});

// ROTA DE EXCLUSÃO DE USUÁRIO - CORRIGIDA PARA RENDERIZAR A VIEW 'ERROR'
app.post('/usuarios/excluir/:id', checkAuth, async (req, res) => {
    const userId = req.params.id;
    try {
        const query = 'DELETE FROM Usuario WHERE id_usuario = ?';
        await db.query(query, [userId]);
        
        res.redirect('/usuarios');
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        // Tratamento de erro que renderiza 'error.ejs'
        res.render('error', { 
            message: 'Não foi possível excluir o usuário. Ele pode ter empréstimos ou outras referências associadas (chave estrangeira).',
            error: error 
        });
    }
});

// ========================================================
// CRUD DE BANCOS
// ========================================================
app.get('/bancos', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Banco_Financeira ORDER BY nome');
        res.render('bancos', { 
            bancos: rows, 
            user: req.session.user 
        });
    } catch (err) {
        console.error("Erro ao listar bancos:", err);
        res.redirect('/dashboard');
    }
});

// ROTA GET: Formulário de inclusão de banco (VISUAL LIMPO)
app.get('/bancos/novo', checkAuth, (req, res) => {
    res.render('banco-incluir', { user: req.session.user });
});

app.post('/bancos/incluir', checkAuth, async (req, res) => {
    const { nome, cnpj, contato } = req.body;
    try {
        await db.query(
            'INSERT INTO Banco_Financeira (nome, cnpj, contato) VALUES (?, ?, ?)',
            [nome, cnpj, contato]
        );
        res.redirect('/bancos');
    } catch (err) {
        console.error("Erro ao incluir banco:", err);
        res.redirect('/bancos');
    }
});
app.get('/bancos/editar/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM Banco_Financeira WHERE id_banco = ?', [id]);
        if (rows.length > 0) {
            res.render('banco-editar', { 
                banco: rows[0], 
                user: req.session.user 
            });
        } else {
            res.redirect('/bancos');
        }
    } catch (err) {
        console.error("Erro ao buscar banco para edição:", err); 
        res.redirect('/bancos');
    }
});
app.post('/bancos/editar/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    const { nome, cnpj, contato } = req.body;
    try {
        await db.query(
            'UPDATE Banco_Financeira SET nome = ?, cnpj = ?, contato = ? WHERE id_banco = ?',
            [nome, cnpj, contato, id]
        );
        res.redirect('/bancos');
    } catch (err) {
        console.error("Erro ao editar banco:", err);
        res.redirect('/bancos');
    }
});

// ROTA DE EXCLUSÃO DE BANCO - CORRIGIDA PARA RENDERIZAR A VIEW 'ERROR'
app.post('/bancos/excluir/:id', checkAuth, async (req, res) => {
    const bancoId = req.params.id;
    try {
        // Correto: DELETE FROM Banco_Financeira
        const query = 'DELETE FROM Banco_Financeira WHERE id_banco = ?'; 
        await db.query(query, [bancoId]);
        
        res.redirect('/bancos');
    } catch (error) {
        console.error('Erro ao excluir banco:', error);
        // Tratamento de erro que renderiza 'error.ejs'
        res.render('error', { 
            message: 'Não foi possível excluir o banco/financeira. Verifique se existem empréstimos associados a ele (chave estrangeira).',
            error: error 
        });
    }
});

// ========================================================
// CRUD DE EMPRÉSTIMOS
// ========================================================
app.get('/emprestimos', checkAuth, async (req, res) => {
    try {
        const [emprestimos] = await db.query(`
            SELECT 
                e.*, 
                u.nome AS nome_usuario, 
                b.nome AS nome_banco 
            FROM Emprestimo e
            LEFT JOIN Usuario u ON e.id_usuario = u.id_usuario
            LEFT JOIN Banco_Financeira b ON e.id_banco = b.id_banco
            ORDER BY e.id_emprestimo DESC
        `);
        
        res.render('emprestimos', { 
            emprestimos: emprestimos, 
            user: req.session.user
        });
    } catch (err) {
        console.error("Erro ao listar emprestimos:", err);
        res.redirect('/dashboard');
    }
});

// ROTA GET: Formulário de inclusão de empréstimo (VISUAL LIMPO - precisa de selects)
app.get('/emprestimos/novo', checkAuth, async (req, res) => {
    try {
        const [usuarios] = await db.query('SELECT id_usuario, nome FROM Usuario ORDER BY nome');
        const [bancos] = await db.query('SELECT id_banco, nome FROM Banco_Financeira ORDER BY nome');

        res.render('emprestimo-incluir', { 
            user: req.session.user,
            usuarios: usuarios,
            bancos: bancos
        });
    } catch (err) {
        console.error("Erro ao carregar formulario de emprestimo:", err);
        res.redirect('/emprestimos');
    }
});

app.post('/emprestimos/incluir', checkAuth, async (req, res) => {
    try {
        const { 
            id_usuario, id_banco, valor, taxa, indexador, 
            status, data_inicio, data_fim 
        } = req.body;
        const dtInicio = data_inicio || null;
        const dtFim = data_fim || null;
        await db.query(
            `INSERT INTO Emprestimo 
             (id_usuario, id_banco, valor, taxa, indexador, status, data_inicio, data_fim) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id_usuario, id_banco, valor, taxa, indexador, status, dtInicio, dtFim]
        );
        res.redirect('/emprestimos');
    } catch (err) {
        console.error("Erro ao incluir emprestimo:", err);
        res.redirect('/emprestimos');
    }
});
app.get('/emprestimos/editar/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [emprestimoRows] = await db.query('SELECT * FROM Emprestimo WHERE id_emprestimo = ?', [id]);
        if (emprestimoRows.length === 0) {
            return res.redirect('/emprestimos');
        }
        const [usuarios] = await db.query('SELECT id_usuario, nome FROM Usuario ORDER BY nome');
        const [bancos] = await db.query('SELECT id_banco, nome FROM Banco_Financeira ORDER BY nome');

        res.render('emprestimo-editar', { 
            emprestimo: emprestimoRows[0], 
            usuarios: usuarios, 
            bancos: bancos,
            user: req.session.user
        });
    } catch (err) {
        console.error("Erro ao buscar emprestimo para edição:", err);
        res.redirect('/emprestimos');
    }
});
app.post('/emprestimos/editar/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const { 
            id_usuario, id_banco, valor, taxa, indexador, 
            status, data_inicio, data_fim 
        } = req.body;
        const dtInicio = data_inicio || null;
        const dtFim = data_fim || null;
        await db.query(
            `UPDATE Emprestimo SET 
             id_usuario = ?, id_banco = ?, valor = ?, taxa = ?, indexador = ?, 
             status = ?, data_inicio = ?, data_fim = ? 
             WHERE id_emprestimo = ?`,
            [id_usuario, id_banco, valor, taxa, indexador, status, dtInicio, dtFim, id]
        );
        res.redirect('/emprestimos');
    } catch (err) {
        console.error("Erro ao editar emprestimo:", err);
        res.redirect('/emprestimos');
    }
});

// ROTA DE EXCLUSÃO DE EMPRÉSTIMO - CORRIGIDA COM checkAuth e tratamento de erro
app.post('/emprestimos/excluir/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM Emprestimo WHERE id_emprestimo = ?', [id]);
        res.redirect('/emprestimos');
    } catch (err) {
        console.error("Erro ao excluir emprestimo:", err);
        // Tratamento de erro que renderiza 'error.ejs'
        res.render('error', { 
            message: 'Não foi possível excluir o empréstimo.',
            error: err 
        });
    }
});


// ----- LIGA O SERVIDOR -----
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});